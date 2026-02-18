import '@testing-library/jest-dom'

// Mock scrollIntoView (not implemented in jsdom)
Element.prototype.scrollIntoView = () => {}
