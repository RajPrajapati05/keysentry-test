const github = require('./github');
const gitlab = require('./gitlab');
const bitbucket = require('./bitbucket');

const providers = { github, gitlab, bitbucket };

function getProvider(name) {
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown provider: ${name}`);
  return provider;
}

module.exports = { getProvider };