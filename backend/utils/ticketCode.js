// Short shareable ticket reference codes (e.g. "ZTX-7K9P-2A").
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generate() {
    let body = '';
    for (let i = 0; i < 6; i++) body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return `ZTX-${body.slice(0, 4)}-${body.slice(4)}`;
}

module.exports = { generate };
