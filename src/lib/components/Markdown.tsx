import React from "react"
import Markdown from "markdown-to-jsx"
import { CodeBlock } from "./SyntaxHighlight"

interface MarkdownRendererProps {
  content: string
  streaming?: boolean
}

// Inline code component
const InlineCode = ({ children, ...props }: any) => {
  return (
    <code 
      className="bg-gray-100 text-gray-900 px-2 py-1 rounded-md text-sm border border-gray-200 font-mono font-medium shadow-sm"
      {...props}
    >
      {children}
    </code>
  )
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, streaming }) => {
  return (
    <div className="markdown-content text-gray-800 prose prose-sm max-w-none">
      <Markdown
        options={{
          overrides: {
            // Code block styling with syntax highlighting
            code: ({ children, className, ...props }) => {
              // Check if this is a code block (has language class) or inline code
              const isCodeBlock = className && className.startsWith('language-')
              
              if (isCodeBlock) {
                return <CodeBlock className={className} {...props}>{children}</CodeBlock>
              } else {
                return <InlineCode {...props}>{children}</InlineCode>
              }
            },
            pre: ({ children, ...props }) => {
              // Check if this is a code block by looking for code child
              const firstChild = React.Children.toArray(children)[0]
              if (React.isValidElement(firstChild) && firstChild.type === 'code') {
                const codeProps = firstChild.props as any
                if (codeProps.className && codeProps.className.startsWith('language-')) {
                  // This is a code block, render with syntax highlighting
                  return <CodeBlock className={codeProps.className}>{codeProps.children}</CodeBlock>
                }
              }
              
              // Otherwise, render as a regular pre
              return (
                <pre className="bg-gray-50 rounded-xl p-4 overflow-x-auto mb-4 border border-gray-200 font-mono text-sm leading-relaxed shadow-sm" {...props}>
                  {children}
                </pre>
              )
            },
            // Paragraph styling
            p: {
              props: {
                className: "mb-4 last:mb-0 text-gray-800 leading-relaxed text-base"
              }
            },
            // Heading styling
            h1: {
              props: {
                className: "text-2xl font-bold mb-6 mt-8 text-gray-900 border-b border-gray-200 pb-3"
              }
            },
            h2: {
              props: {
                className: "text-xl font-bold mb-4 mt-6 text-gray-900"
              }
            },
            h3: {
              props: {
                className: "text-lg font-bold mb-3 mt-5 text-gray-900"
              }
            },
            h4: {
              props: {
                className: "text-base font-bold mb-2 mt-4 text-gray-900"
              }
            },
            // List styling
            ul: {
              props: {
                className: "list-disc ml-6 mb-4 text-gray-800 space-y-2"
              }
            },
            ol: {
              props: {
                className: "list-decimal ml-6 mb-4 text-gray-800 space-y-2"
              }
            },
            li: {
              props: {
                className: "text-gray-800 leading-relaxed"
              }
            },
            // Link styling
            a: {
              props: {
                className: "text-blue-600 hover:text-blue-700 underline transition-colors font-medium",
                target: "_blank",
                rel: "noopener noreferrer"
              }
            },
            // Blockquote styling
            blockquote: {
              props: {
                className: "border-l-4 border-blue-300 pl-6 italic text-gray-700 mb-6 bg-blue-50 py-4 rounded-r-xl shadow-sm"
              }
            },
            // Table styling
            table: {
              props: {
                className: "border-collapse border border-gray-200 mb-6 text-gray-800 w-full rounded-xl overflow-hidden shadow-sm"
              }
            },
            th: {
              props: {
                className: "border border-gray-200 px-4 py-3 bg-gray-50 text-gray-900 font-semibold text-left"
              }
            },
            td: {
              props: {
                className: "border border-gray-200 px-4 py-3 text-gray-800"
              }
            },
            // Strong/Bold styling
            strong: {
              props: {
                className: "font-semibold text-gray-900"
              }
            },
            // Emphasis/Italic styling
            em: {
              props: {
                className: "italic text-gray-700"
              }
            },
            // Horizontal rule
            hr: {
              props: {
                className: "border-gray-200 my-8"
              }
            },
            // Image styling
            img: {
              props: {
                className: "rounded-xl border border-gray-200 max-w-full h-auto my-6 shadow-sm"
              }
            }
          }
        }}
      >
        {content + (streaming ? '▎' : '')}
      </Markdown>
    </div>
  )
}

export default MarkdownRenderer
