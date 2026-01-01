const crypto = require('crypto');

function makeid(len = 8) {
  // returns an alphanumeric id of length `len`
  return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}

module.exports = { makeid };
