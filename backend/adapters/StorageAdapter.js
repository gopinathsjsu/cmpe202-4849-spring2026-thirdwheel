// Adapter pattern: pluggable file storage (local disk for dev, GCS for prod).

const fs = require('fs');
const path = require('path');

class LocalDiskStorage {
    constructor(opts = {}) {
        this.dir = opts.dir || path.join(__dirname, '..', 'uploads');
        this.publicBase = opts.publicBase || '/uploads';
        if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
    }
    async upload({ key, buffer }) {
        const filePath = path.join(this.dir, key);
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await fs.promises.writeFile(filePath, buffer);
        return { url: `${this.publicBase}/${key}`, key };
    }
    async delete(key) {
        try { await fs.promises.unlink(path.join(this.dir, key)); } catch (_) {}
    }
}

class GCSStorage {
    constructor(opts) {
        const { Storage } = require('@google-cloud/storage');
        this.bucket = new Storage().bucket(opts.bucket);
        this.publicBase = `https://storage.googleapis.com/${opts.bucket}`;
    }
    async upload({ key, buffer, contentType = 'application/octet-stream' }) {
        const file = this.bucket.file(key);
        await file.save(buffer, { contentType, resumable: false, public: true });
        return { url: `${this.publicBase}/${key}`, key };
    }
    async delete(key) {
        try { await this.bucket.file(key).delete(); } catch (_) {}
    }
}

let storage = null;
function getStorage() {
    if (storage) return storage;
    const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
    if (provider === 'gcs') {
        storage = new GCSStorage({ bucket: process.env.GCS_BUCKET });
    } else {
        storage = new LocalDiskStorage();
    }
    return storage;
}

module.exports = { getStorage, LocalDiskStorage, GCSStorage };
