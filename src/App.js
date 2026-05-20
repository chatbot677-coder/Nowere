
import { BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import ChatHome from './pages/ChatHome';
function App() {

  return (
  <Router>
    <Routes>
      <Route path="/chat/:id?" element={<ChatHome />}/>
      <Route path="/" element={<ChatHome />} />
    </Routes>
  </Router>
);
}

export default App;