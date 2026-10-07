// Site-wide settings.
// Polls write one JSON file per answer into the PRIVATE repo below, using a
// fine-grained token scoped to that repo only (Contents: read & write).
// tokenParts = base64 of the token, split in chunks. Empty → local demo mode.
window.MICRO_CONFIG = {
  session: "ws26",
  // public half of the name key (RSA-OAEP, SHA-256): students' names are encrypted with it on their own device;
  // only the private half (kept off this repo, on Can's computer) can read them. tools/names.py decrypts.
  // SHA-256 of "micro-teacher:" + the teacher code (the code itself is only in MICRO-CAN/00_admin/keys/teacher-code.txt)
  teacherHash: "13706ce632ad00d840cfa7d9c9e592e7acca44e0c3e2c8fd237920a1f92b43f4",
  namesKey: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA072X/6tcRVaV34QWeFc2KJSlq8qCmS99TTvb/kOOc/2iB10jUpjhroxi+pvFH45/iYug3ZohJoLBDNhRDZq8BS/DgQ4+KTfvYCx8D7sH9tLxOEBH5GyuQgifTXl+MJisoJ6+Dfi3Y4IxqnhdnmVu6nVLhqNjGi1B9UpXo9Gk2ua7KsLd4m5bk44Zwt+B2V60nkXmuNh8qD4AD4Rlk5BP5XDpxLRBACYL52JCppcou5tt8mk8ikuC9kYFl1V37Rpc88Nq6CwYK00GzDyoYluWGHD+DpaP+7ypetkA/+N7twsfJly2dxCTRBFCEwmHjCuHP5VEJPg4lDUoLzu+asBenwIDAQAB",
  github: {
    owner: "can-celebi",
    repo: "micro-business-data",
    branch: "main",
    tokenParts: ["Z2l0aHViX3BhdF8xMUFOWkFDN1EwY0hGaTE4MWJP", "SEpCX1RuSm41NjdEbldndnFGTDg5SlJkNWtFdVlZ", "RkNnYmxOU0d5d2gyaEdZTFRJV0FHTjc3SVN0THJ3ZUJD"]
  }
};
