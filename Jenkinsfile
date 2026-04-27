// Zestify CI/CD pipeline.
// Triggers on every push (configure SCM polling or webhook on the Jenkins job).
// Stages mirror a real-company workflow: lint → unit → build → integration → smoke → publish.

pipeline {
    agent any

    options {
        timestamps()
        ansiColor('xterm')
        buildDiscarder(logRotator(numToKeepStr: '30', daysToKeepStr: '14'))
        timeout(time: 30, unit: 'MINUTES')
    }

    triggers {
        // Poll SCM every 2 min as a fallback when no webhook is configured.
        pollSCM('H/2 * * * *')
    }

    environment {
        COMPOSE_PROJECT_NAME = "zestify-ci-${env.BUILD_NUMBER}"
        API_URL              = "http://localhost:5001"
        FRONTEND_URL         = "http://localhost:3000"
        DOCKER_BUILDKIT      = '1'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git rev-parse --short HEAD > .git-sha && echo "SHA=$(cat .git-sha)"'
            }
        }

        stage('Install') {
            parallel {
                stage('Backend deps') {
                    steps {
                        dir('backend') { sh 'npm ci || npm install' }
                    }
                }
                stage('Frontend deps') {
                    steps {
                        dir('frontend') { sh 'npm ci || npm install' }
                    }
                }
            }
        }

        stage('Lint') {
            parallel {
                stage('Frontend lint') {
                    steps {
                        dir('frontend') { sh 'npm run lint' }
                    }
                }
            }
        }

        stage('Unit tests') {
            steps {
                dir('backend') {
                    sh 'npm run test:unit'
                }
            }
        }

        stage('Build images') {
            steps {
                sh 'docker compose -p ${COMPOSE_PROJECT_NAME} build'
            }
        }

        stage('Bring up stack') {
            steps {
                sh '''
                    docker compose -p ${COMPOSE_PROJECT_NAME} up -d postgres
                    # wait for pg
                    for i in $(seq 1 30); do
                        if docker compose -p ${COMPOSE_PROJECT_NAME} exec -T postgres pg_isready -U zestify -d zestify >/dev/null 2>&1; then
                            echo "Postgres ready"; break
                        fi
                        sleep 2
                    done
                    docker compose -p ${COMPOSE_PROJECT_NAME} run --rm seed
                    docker compose -p ${COMPOSE_PROJECT_NAME} up -d backend frontend
                    # wait for backend ready
                    for i in $(seq 1 60); do
                        if curl -fsS ${API_URL}/readyz >/dev/null 2>&1; then echo "API ready"; break; fi
                        sleep 2
                    done
                    # wait for frontend
                    for i in $(seq 1 60); do
                        if curl -fsS ${FRONTEND_URL}/ >/dev/null 2>&1; then echo "Frontend ready"; break; fi
                        sleep 2
                    done
                '''
            }
        }

        stage('Integration tests') {
            steps {
                dir('backend') {
                    sh 'TEST_API_URL=${API_URL} npm run test:integration'
                }
            }
        }

        stage('System smoke test') {
            steps {
                sh 'API_URL=${API_URL} FRONTEND_URL=${FRONTEND_URL} bash scripts/smoke.sh'
            }
        }

        stage('Publish images to GCP Artifact Registry') {
            when {
                branch 'main'
            }
            environment {
                GCP_PROJECT  = "${env.GCP_PROJECT  ?: 'healthy-mender-491009-b4'}"
                GCP_REGION   = "${env.GCP_REGION   ?: 'us-west1'}"
                GCP_REPO     = "${env.GCP_REPO     ?: 'zestify'}"
                STRIPE_PUBLISHABLE_KEY = credentials('stripe-publishable-key')
            }
            steps {
                sh '''
                    set -e
                    SHA=$(cat .git-sha)
                    REGISTRY="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT}/${GCP_REPO}"
                    gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet

                    docker buildx build --platform linux/amd64 \
                        -t "${REGISTRY}/backend:${SHA}" -t "${REGISTRY}/backend:latest" \
                        --push ./backend

                    docker buildx build --platform linux/amd64 \
                        --build-arg "NEXT_PUBLIC_API_URL=__placeholder__" \
                        --build-arg "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}" \
                        -t "${REGISTRY}/frontend:${SHA}" -t "${REGISTRY}/frontend:latest" \
                        --push ./frontend
                '''
            }
        }

        stage('Rolling update MIG (backend + frontend)') {
            when { branch 'main' }
            environment {
                GCP_PROJECT = "${env.GCP_PROJECT ?: 'healthy-mender-491009-b4'}"
                GCP_REGION  = "${env.GCP_REGION  ?: 'us-west1'}"
            }
            steps {
                sh '''
                    set -e
                    SHA=$(cat .git-sha)
                    REGISTRY="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT}/zestify"

                    # Update backend instance template to point at new image, then rolling-replace MIG.
                    gcloud compute instance-templates create-with-container "zestify-backend-${SHA}" \
                        --machine-type=e2-small \
                        --container-image="${REGISTRY}/backend:${SHA}" \
                        --container-restart-policy=always \
                        --container-env="NODE_ENV=production,PGHOST=${PGHOST},PGUSER=zestify,DB_USER=zestify,PGPASSWORD=${DB_PASS},DB_PASS=${DB_PASS},PGDATABASE=zestify,DB_NAME=zestify,JWT_SECRET=${JWT_SECRET},STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY},CORS_ORIGINS=*,EMAIL_PROVIDER=ethereal,LOG_LEVEL=info,AUTH_RATE_LIMIT_MAX=200" \
                        --tags=zestify,http-server \
                        --no-shielded-secure-boot
                    gcloud compute instance-groups managed rolling-action start-update zestify-backend-mig \
                        --region="${GCP_REGION}" --version="template=zestify-backend-${SHA}" --max-surge=1 --max-unavailable=0

                    # Frontend rebuild with LB IP baked in (NEXT_PUBLIC_API_URL=/api → same-origin via LB).
                    docker buildx build --platform linux/amd64 \
                        --build-arg "NEXT_PUBLIC_API_URL=/api" \
                        --build-arg "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}" \
                        -t "${REGISTRY}/frontend:${SHA}" -t "${REGISTRY}/frontend:latest" \
                        --push ./frontend

                    gcloud compute instance-templates create-with-container "zestify-frontend-${SHA}" \
                        --machine-type=e2-small \
                        --container-image="${REGISTRY}/frontend:${SHA}" \
                        --container-restart-policy=always \
                        --container-env="NODE_ENV=production,PORT=3000,HOSTNAME=0.0.0.0" \
                        --tags=zestify,http-server \
                        --no-shielded-secure-boot
                    gcloud compute instance-groups managed rolling-action start-update zestify-frontend-mig \
                        --region="${GCP_REGION}" --version="template=zestify-frontend-${SHA}" --max-surge=1 --max-unavailable=0
                '''
            }
        }

        stage('Wait + live smoke against LB') {
            when { branch 'main' }
            steps {
                sh '''
                    set -e
                    LB_IP=$(gcloud compute forwarding-rules describe zestify-fwd --global --format='value(IPAddress)')
                    echo "LB IP: ${LB_IP}"
                    until curl -fsS "http://${LB_IP}/api/health" >/dev/null 2>&1; do sleep 10; done
                    API_URL="http://${LB_IP}" FRONTEND_URL="http://${LB_IP}" bash scripts/smoke.sh
                '''
            }
        }
    }

    post {
        always {
            sh '''
                docker compose -p ${COMPOSE_PROJECT_NAME} logs --no-color > compose-logs.txt 2>&1 || true
                docker compose -p ${COMPOSE_PROJECT_NAME} down -v --remove-orphans || true
            '''
            archiveArtifacts artifacts: 'compose-logs.txt', allowEmptyArchive: true
        }
        success {
            echo "Build #${env.BUILD_NUMBER} OK"
        }
        failure {
            echo "Build #${env.BUILD_NUMBER} FAILED — see compose-logs.txt and stage output"
        }
    }
}
