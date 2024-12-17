- Read-only everything (only GET requests)
[DONE] Rewrite volume paths
  - Change relative paths from inside-container path to outside-container path
[DONE] Gate only certain registries
- Filter results for container, network, and image lookups


- Limitations
  - Credentials are added to requests by the client. So, rewriting from one registry to another is unlikely to have creds