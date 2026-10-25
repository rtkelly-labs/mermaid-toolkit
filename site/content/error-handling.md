# Error Handling & Degradation

When an invalid or unsupported diagram syntax is encountered, the build does not crash.

With `onError: 'error'`, the diagram is replaced with an accessible error banner:

```mermaid
invalid syntax here !!!
```
