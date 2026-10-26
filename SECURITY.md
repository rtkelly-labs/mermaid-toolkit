# Security Policy

## Supported Versions

We release patches and security fixes for the active version line:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within `@rtkelly-labs/mermaid-toolkit`, please do **not** report it via a public GitHub issue.

Instead, please report vulnerabilities privately using GitHub's Private Vulnerability Reporting:
1. Navigate to the [Security Advisories](https://github.com/rtkelly-labs/mermaid-toolkit/security/advisories/new) tab.
2. Submit a report describing the vulnerability, affected versions, and steps or code to reproduce.

Alternatively, contact the maintainer directly at **security@rtkelly.com**.

You can expect an initial response within 48 hours acknowledging receipt of your report. We will coordinate remediation and disclosure timelines before any public release.

## Security Architecture & Threat Surface

### 1. Parsing Untrusted Input & DoS Prevention
`@rtkelly-labs/mermaid-toolkit` uses text-based parsing and token analysis to extract diagram topologies, labels, and metadata. When parsing diagrams supplied by untrusted end-users:
- Complex or maliciously crafted diagrams may lead to elevated CPU utilization or regular expression backtracking.
- If processing user-provided diagrams in a server runtime or interactive API, ensure strict request timeouts, input size limits (e.g. diagrams < 50 KB), and sandboxed execution boundaries.
- For production web applications, we strongly recommend pre-compiling diagrams at static build time (e.g. via Remark, Rehype, or Marked plugins).

### 2. Output Interpolation & XSS Considerations
The toolkit generates SVG markup, HTML5 wrappers, and ASCII text:
- Built-in MDX and Marked plugins (`remarkMermaid`, `rehypeMermaid`, `markedMermaid`) sanitize HTML class names and escape fallbacks to prevent attribute injection.
- When consuming low-level APIs directly (such as `renderSvg()` or `mermaidToAscii()`) and inserting the result into the DOM via `innerHTML` or React's `dangerouslySetInnerHTML`, consumers must treat diagram labels from untrusted sources as potentially dangerous.
- If diagram input contains user-generated content, always run the generated SVG output through a trusted HTML/SVG sanitizer (such as DOMPurify) before inserting into the live client DOM.
