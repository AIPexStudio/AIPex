# AIpex Project Development Guidelines

## Language Requirements

### 🌐 English-Only Policy
- All code, comments, documentation, and commit messages MUST be in English
- No Chinese characters or other non-English text allowed in the codebase
- Use clear, professional English for all communications
- Variable names, function names, and comments should be descriptive in English

## Code Style Guidelines

### 📝 Naming Conventions
- Use camelCase for variables and functions
- Use PascalCase for components and interfaces
- Use UPPER_SNAKE_CASE for constants
- Prefix interfaces with 'I' (e.g., IProps, IState)
- Use descriptive English names that clearly indicate purpose

### 🏗️ Component Structure
- One component per file
- Follow functional component pattern with hooks
- Export default the main component
- Keep components focused and single-responsibility
- Use TypeScript interfaces for props

### 💅 Styling
- Use Tailwind CSS for styling
- Follow mobile-first responsive design
- Maintain dark/light theme compatibility
- Use semantic class names in English

## UI Design System

### 🎨 Minimalist Design Philosophy
- Follow Apple Spotlight and Raycast design principles
- Emphasize clean, uncluttered interfaces
- Prioritize functionality over decoration
- Use subtle animations and transitions
- Maintain consistent visual hierarchy

### 🎯 Color Palette
- **Primary Colors:**
  - White (`#FFFFFF`) - Main background and primary text
  - Red (`#FF3B30`) - Accent color for actions and highlights
  - Gray (`#8E8E93`) - Secondary text and borders
- **Supporting Colors:**
  - Light Gray (`#F2F2F7`) - Subtle backgrounds and dividers
  - Dark Gray (`#1C1C1E`) - Dark mode backgrounds
  - Red variants: Light Red (`#FF6B6B`), Dark Red (`#CC2E2E`)
- **Usage Guidelines:**
  - Use white as the primary background
  - Apply red sparingly for CTAs and important actions
  - Use gray for secondary information and subtle elements

### 📐 Typography
- **Font Family:** Inter (already included in assets)
- **Font Weights:**
  - Regular (400) - Body text
  - Medium (500) - Subheadings
  - SemiBold (600) - Headings
  - Bold (700) - Important labels
- **Font Sizes:**
  - 12px - Captions and small text
  - 14px - Body text
  - 16px - Subheadings
  - 18px - Headings
  - 24px - Large headings

### 🔲 Component Design
- **Cards and Containers:**
  - Use subtle shadows: `shadow-sm` or `shadow-md`
  - Border radius: 8px for cards, 4px for buttons
  - Minimal borders: `border-gray-200` or `border-gray-300`
- **Buttons:**
  - Primary: White background with red text/border
  - Secondary: Transparent with gray border
  - Hover states: Subtle opacity changes
- **Input Fields:**
  - Clean borders with focus states
  - Minimal padding and spacing
  - Clear placeholder text in gray

### 📱 Layout Principles
- **Spacing System:**
  - 4px, 8px, 12px, 16px, 24px, 32px, 48px
  - Use consistent spacing throughout
- **Grid System:**
  - 12-column grid for complex layouts
  - Flexible containers for responsive design
- **Margins and Padding:**
  - Generous whitespace between sections
  - Compact spacing within components

### ✨ Interactive Elements
- **Hover States:**
  - Subtle background color changes
  - Smooth transitions (150ms ease-in-out)
- **Focus States:**
  - Clear visual indicators
  - Red accent color for focus rings
- **Loading States:**
  - Minimal spinners or skeleton screens
  - Maintain visual hierarchy during loading

### 🌙 Dark Mode Support
- **Dark Theme Colors:**
  - Background: `#1C1C1E`
  - Surface: `#2C2C2E`
  - Text: `#FFFFFF`
  - Secondary Text: `#8E8E93`
- **Consistent Contrast:**
  - Maintain WCAG AA accessibility standards
  - Use appropriate color combinations for both themes

## Development Practices

### 🔍 Code Quality
- Write self-documenting code with clear English names
- Add English comments for complex logic
- Keep functions small and focused
- Follow DRY (Don't Repeat Yourself) principle
- Use TypeScript strictly

### 🧪 Testing
- Write meaningful test descriptions in English
- Test component rendering and interactions
- Test utility functions
- Maintain good test coverage
- Use descriptive test case names

### 🔄 State Management
- Use React hooks for local state
- Keep state management simple
- Document state structures in English
- Clear state update patterns

## File Organization

### 📁 Directory Structure
```
src/
  ├── components/     # Reusable UI components
  ├── features/       # Feature-specific components
  ├── hooks/         # Custom React hooks
  ├── utils/         # Utility functions
  ├── types/         # TypeScript type definitions
  └── styles/        # Global styles
```

### 📄 File Naming
- Use kebab-case for file names
- Add `.component.tsx` suffix for components
- Add `.test.tsx` suffix for test files
- Add `.types.ts` suffix for type definition files

## Git Workflow

### 💫 Commit Guidelines
- Write clear commit messages in English
- Use conventional commit format
- Keep commits focused and atomic
- Reference issues in commit messages

### 🌿 Branch Strategy
- main: production-ready code
- develop: development branch
- feature/*: new features
- bugfix/*: bug fixes
- release/*: release preparation

## Documentation

### 📚 Code Documentation
- Document complex functions with JSDoc in English
- Include usage examples
- Document component props
- Keep documentation up-to-date
- Use clear technical English

### 🚀 README Maintenance
- Keep README.md updated
- Include setup instructions
- Document available scripts
- List dependencies
- Provide usage examples

## Performance

### ⚡ Optimization Guidelines
- Implement code splitting
- Optimize images and assets
- Use React.memo where appropriate
- Implement lazy loading
- Monitor bundle size

## Accessibility

### ♿ A11y Requirements
- Use semantic HTML
- Include ARIA labels in English
- Ensure keyboard navigation
- Support screen readers
- Test with accessibility tools

## Error Handling

### 🚨 Error Management
- Use English for error messages
- Implement proper error boundaries
- Log errors appropriately
- Provide user-friendly error messages
- Handle edge cases gracefully

## Security

### 🔒 Security Practices
- Sanitize user inputs
- Implement proper authentication
- Follow security best practices
- Use environment variables
- Regular security audits

## Review Process

### 👀 Code Review Guidelines
- Review for English-only compliance
- Check code style consistency
- Verify documentation completeness
- Test functionality
- Review performance impact

## Deployment

### 📦 Release Process
- Version control using semver
- Create release notes in English
- Test in staging environment
- Automated deployment
- Post-deployment verification

Remember: This is a living document. Update these guidelines as the project evolves, always maintaining the English-only requirement throughout the codebase.

# Cursor Rules

## File Modification Rules

### Auto-generated Files
- **NEVER modify `src/style.css`** - This file is automatically generated and should not be edited manually. Any changes to this file will be overwritten during the build process.

### General Guidelines
- Always check if a file is auto-generated before making modifications
- If you need to make styling changes, modify the source files (like Tailwind classes in components) instead of the generated CSS
- When in doubt about whether a file is auto-generated, ask the user for clarification