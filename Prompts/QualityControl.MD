# Prompt for quality check

Perform a quality check of the adapter. Take `AGENTS.md` into account.
Please review the following points:

- Check whether all guidelines in `AGENTS.md` have been followed.
- Has the source code been documented in English?
- Check whether the code is as simple and transparent as possible for software developers.
- Identify functions that are useless and can be removed.
- Search for and name possible security risks in the adapter.
- Check whether existing tests actually use the local code, or whether only dummy classes and structures are being used. Tests that do not use the real code do not allow reliable error detection.
- Check whether there is a test for every class/class member.
- Check whether the project memory is still consistent with the architecture and `AGENTS.md` (folder `memory`, base file `memory/project_index.md`, and the canonical notes linked from there)
- Check if the project implementation follows the documentation in the Iobroker RAG

What are the most important "lessons learned" from your quality check that you would like to share with another agent? Answer in German and in bullet points.
