import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import StreamingToolCall from './StreamingToolCall'

// Mock chrome.runtime.onMessage
const mockAddListener = jest.fn()
const mockRemoveListener = jest.fn()

global.chrome = {
  runtime: {
    onMessage: {
      addListener: mockAddListener,
      removeListener: mockRemoveListener
    }
  }
} as any

describe('StreamingToolCall', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when not active', () => {
    render(
      <StreamingToolCall 
        messageId="test-123"
        isActive={false}
      />
    )
    
    expect(screen.queryByText('Streaming AI Response')).not.toBeInTheDocument()
  })

  it('should render when active', () => {
    render(
      <StreamingToolCall 
        messageId="test-123"
        isActive={true}
      />
    )
    
    expect(screen.getByText('Streaming AI Response')).toBeInTheDocument()
    expect(screen.getByText('Real-time tool execution and reasoning')).toBeInTheDocument()
  })

  it('should toggle expanded state when clicking expand button', () => {
    render(
      <StreamingToolCall 
        messageId="test-123"
        isActive={true}
      />
    )
    
    const expandButton = screen.getByRole('button', { name: /show details/i })
    fireEvent.click(expandButton)
    
    // Should show expanded content
    expect(screen.getByText('0 steps • 0 completed')).toBeInTheDocument()
  })

  it('should listen for streaming messages', () => {
    render(
      <StreamingToolCall 
        messageId="test-123"
        isActive={true}
      />
    )
    
    expect(mockAddListener).toHaveBeenCalled()
  })

  it('should clean up listeners on unmount', () => {
    const { unmount } = render(
      <StreamingToolCall 
        messageId="test-123"
        isActive={true}
      />
    )
    
    unmount()
    
    expect(mockRemoveListener).toHaveBeenCalled()
  })
})
