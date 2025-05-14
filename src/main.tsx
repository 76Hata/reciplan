import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
// import './index.css'
import App from './App.tsx'
//import { IngredientList } from './components/IngredientList.tsx'

const rootElement = document.getElementById('root');
if(!rootElement) throw new Error('root Not Found');
createRoot(rootElement).render(
  <StrictMode>
    <ChakraProvider>
      <App />
      {/* <IngredientList /> */}
    </ChakraProvider>
  </StrictMode>
);
