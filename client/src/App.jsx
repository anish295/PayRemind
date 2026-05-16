import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import InvoiceList from './pages/InvoiceList';
import InvoiceNew from './pages/InvoiceNew';
import InvoiceDetail from './pages/InvoiceDetail';
import InvoiceEdit from './pages/InvoiceEdit';
import Companies from './pages/Companies';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/invoices" element={<InvoiceList />} />
          <Route path="/invoices/new" element={<InvoiceNew />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/invoices/:id/edit" element={<InvoiceEdit />} />
          <Route path="/companies" element={<Companies />} />
        </Route>
      </Routes>
    </Router>
  );
}
