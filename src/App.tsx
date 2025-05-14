import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SynonymManager from './pages/SynonymManager';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/synonyms" element={<SynonymManager />} />
    </Routes>
  </BrowserRouter>
);

export default App;
