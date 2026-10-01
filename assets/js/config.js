// Site-wide settings.
// Polls write one JSON file per answer into the PRIVATE repo below, using a
// fine-grained token scoped to that repo only (Contents: read & write).
// tokenParts = base64 of the token, split in chunks. Empty → local demo mode.
window.MICRO_CONFIG = {
  session: "ws26",
  github: {
    owner: "can-celebi",
    repo: "micro-business-data",
    branch: "main",
    tokenParts: []
  }
};
