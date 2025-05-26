import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import axios from 'axios';

// Mock axios
jest.mock('axios');

// Mock Tauri API
window.__TAURI__ = {
  tauri: {
    invoke: jest.fn().mockResolvedValue(true)
  }
};

test('renders decks view by default', async () => {
  // Mock API responses
  axios.get.mockResolvedValueOnce({ data: ['Test Deck 1', 'Test Deck 2'] });
  
  render(<App />);
  
  // Wait for decks to load
  await waitFor(() => {
    expect(screen.getByText('Your Decks')).toBeInTheDocument();
  });
  
  // Check if decks are displayed
  expect(screen.getByText('Test Deck 1')).toBeInTheDocument();
  expect(screen.getByText('Test Deck 2')).toBeInTheDocument();
});

test('can navigate to Add view', async () => {
  // Mock API responses
  axios.get.mockResolvedValueOnce({ data: ['Test Deck'] });
  
  render(<App />);
  
  // Wait for app to load
  await waitFor(() => {
    expect(screen.getByText('Your Decks')).toBeInTheDocument();
  });
  
  // Click Add button
  fireEvent.click(screen.getByText('Add'));
  
  // Check if we're in Add view
  expect(screen.getByText('Front')).toBeInTheDocument();
  expect(screen.getByText('Back')).toBeInTheDocument();
});
