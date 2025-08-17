import React from "react"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CodeBlockProps {
  children: React.ReactNode
  className?: string
  [key: string]: any
}

// Code block component for syntax highlighting
export const CodeBlock: React.FC<CodeBlockProps> = ({ children, className, ...props }) => {
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : 'text'
  
  // Map common language aliases to proper language names
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'sh': 'bash',
    'zsh': 'bash',
    'bash': 'bash',
    'shell': 'bash',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'md': 'markdown',
    'markdown': 'markdown',
    'sql': 'sql',
    'php': 'php',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'csharp': 'csharp',
    'go': 'go',
    'rust': 'rust',
    'rs': 'rust',
    'swift': 'swift',
    'kotlin': 'kotlin',
    'scala': 'scala',
    'r': 'r',
    'dart': 'dart',
    'elixir': 'elixir',
    'clojure': 'clojure',
    'haskell': 'haskell',
    'lua': 'lua',
    'perl': 'perl',
    'groovy': 'groovy',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'ini': 'ini',
    'xml': 'xml',
    'svg': 'xml',
    'diff': 'diff',
    'git': 'diff'
  }
  
  const mappedLanguage = languageMap[language] || language
  
  return (
    <div className="relative group mb-6">
      {/* Language label */}
      <div className="absolute top-0 right-0 px-3 py-1 text-xs font-mono text-gray-600 bg-white rounded-bl-xl border-l border-b border-gray-200 z-10 shadow-sm font-medium">
        {mappedLanguage}
      </div>
      
      <SyntaxHighlighter
        style={oneLight}
        language={mappedLanguage}
        PreTag="div"
        className="rounded-xl border border-gray-200 text-sm overflow-hidden shadow-sm"
        customStyle={{
          margin: 0,
          padding: '1.25rem',
          paddingTop: '1.75rem', // Extra padding for language label
          backgroundColor: '#f8fafc',
          fontSize: '0.875rem',
          lineHeight: '1.7',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          borderRadius: '0.75rem'
        }}
        showLineNumbers={false}
        wrapLines={false}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  )
}

export default CodeBlock
