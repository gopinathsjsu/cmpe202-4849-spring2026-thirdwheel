function validate(schema) {
    return (req, res, next) => {
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = req.body[field];

            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} is required.`);
                continue;
            }

            if (value !== undefined && value !== null && value !== '') {
                if (rules.type === 'string' && typeof value !== 'string') {
                    errors.push(`${field} must be a string.`);
                }

                if (rules.type === 'number' && typeof value !== 'number') {
                    errors.push(`${field} must be a number.`);
                }

                if (rules.type === 'email') {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        errors.push(`${field} must be a valid email address.`);
                    }
                }

                if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
                    errors.push(`${field} must be at least ${rules.minLength} characters.`);
                }

                if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
                    errors.push(`${field} must be at most ${rules.maxLength} characters.`);
                }

                if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
                    errors.push(`${field} must be at least ${rules.min}.`);
                }

                if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
                    errors.push(`${field} must be at most ${rules.max}.`);
                }

                if (rules.enum && !rules.enum.includes(value)) {
                    errors.push(`${field} must be one of: ${rules.enum.join(', ')}.`);
                }

                if (rules.pattern && !rules.pattern.test(value)) {
                    errors.push(`${field} format is invalid.`);
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ error: 'Validation failed.', details: errors });
        }

        next();
    };
}

module.exports = { validate };
