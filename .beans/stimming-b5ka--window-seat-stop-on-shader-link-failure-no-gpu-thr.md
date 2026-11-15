---
# stimming-b5ka
title: 'Window seat: stop on shader link failure, no GPU thrash'
status: in-progress
type: bug
priority: normal
created_at: 2026-11-10T17:27:19Z
updated_at: 2026-11-10T17:27:28Z
parent: stimming-w1nd
---

A visitor's GPU failed to link the window shaders (empty log), then the context was lost and restored in a loop.

- [x] renderer.debug.onShaderError stops the loop and shows a message
- [x] context loss stops the loop; restore wakes it only if nothing broke
- [x] injected link error tested: message shows, canvas hides
- [ ] find the visitor's device and lighten the shader for it
