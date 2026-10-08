// Site-wide settings.
// Polls write one JSON file per answer into the PRIVATE repo below, using a
// fine-grained token scoped to that repo only (Contents: read & write).
// tokenParts = base64 of the token, split in chunks. Empty → local demo mode.
window.MICRO_CONFIG = {
  session: "ws26",
  // live stream (Can, 08.10): the u:stream WEB player only (never the R2R link)
  stream: "https://ustream.univie.ac.at/live/24bc96b6-49c7-49f6-8ed4-dc4e9fb1d456",
  // public half of the name key (RSA-OAEP, SHA-256): students' names are encrypted with it on their own device;
  // only the private half (kept off this repo, on Can's computer) can read them. tools/names.py decrypts.
  // SHA-256 of "micro-teacher:" + the teacher code (the code itself is only in MICRO-CAN/00_admin/keys/teacher-code.txt)
  teacherHash: "13706ce632ad00d840cfa7d9c9e592e7acca44e0c3e2c8fd237920a1f92b43f4",
  namesKey: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA072X/6tcRVaV34QWeFc2KJSlq8qCmS99TTvb/kOOc/2iB10jUpjhroxi+pvFH45/iYug3ZohJoLBDNhRDZq8BS/DgQ4+KTfvYCx8D7sH9tLxOEBH5GyuQgifTXl+MJisoJ6+Dfi3Y4IxqnhdnmVu6nVLhqNjGi1B9UpXo9Gk2ua7KsLd4m5bk44Zwt+B2V60nkXmuNh8qD4AD4Rlk5BP5XDpxLRBACYL52JCppcou5tt8mk8ikuC9kYFl1V37Rpc88Nq6CwYK00GzDyoYluWGHD+DpaP+7ypetkA/+N7twsfJly2dxCTRBFCEwmHjCuHP5VEJPg4lDUoLzu+asBenwIDAQAB",
  // lecture dates (course-facts.md) + class time, Vienna time: the pulse only counts taps inside this window (Can, 08.10)
  classTime: ["18:30", "20:00"],
  lectures: {
    L01: "2026-10-01", L02: "2026-10-07", L03: "2026-10-08", L04: "2026-10-14", L05: "2026-10-15", L06: "2026-10-21",
    L07: "2026-10-22", L08: "2026-10-28", L09: "2026-10-29", L10: "2026-11-04", L11: "2026-11-05", L12: "2026-11-11",
    L13: "2026-11-12", L14: "2026-11-18", L15: "2026-11-25", L16: "2026-11-26", L17: "2026-12-02", L18: "2026-12-03",
    L19: "2026-12-09", L20: "2026-12-10", L21: "2026-12-16", L22: "2026-12-17", L23: "2027-01-07", L24: "2027-01-13",
    L25: "2027-01-14", L26: "2027-01-20", L27: "2027-01-21", L28: "2027-01-27",
  },
  github: {
    owner: "can-celebi",
    repo: "micro-business-data",
    branch: "main",
    tokenParts: ["Z2l0aHViX3BhdF8xMUFOWkFDN1EwY0hGaTE4MWJP", "SEpCX1RuSm41NjdEbldndnFGTDg5SlJkNWtFdVlZ", "RkNnYmxOU0d5d2gyaEdZTFRJV0FHTjc3SVN0THJ3ZUJD"]
  }
};
