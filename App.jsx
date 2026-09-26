import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { getReports, createReport, getReportById, updateReportStatus } from './services/reportService';
import { getDepartments } from './services/departmentService';
import { getMessages, sendMessage } from './services/messageService';
import { getStatistics, getUsers, updateUser, getAuditLogs, createDepartment } from './services/adminService';
import { useEffect, useMemo, useState } from 'react';

function HomePage() {
  return (
    <div className="page-shell hero-shell">
      <section className="hero container">
        <div>
          <p className="eyebrow">Public emergency reporting</p>
          <h1>Report urgent incidents quickly and safely.</h1>
          <p className="lead">
            Emergency Services helps citizens submit reports, route them to the correct department,
            and keep a record of updates and communication.
          </p>
          <div className="cta-row">
            <Link className="primary-button" to="/register">REPORT AN EMERGENCY</Link>
            <Link className="secondary-button" to="/login">Log In</Link>
          </div>
        </div>
        <div className="info-card">
          <h3>How it works</h3>
          <ol>
            <li>Choose the emergency type.</li>
            <li>Provide your location and contact details.</li>
            <li>Submit the report to the platform.</li>
            <li>Track status updates and messages.</li>
          </ol>
          <p className="warning-text">If anyone is in immediate danger, call your local emergency number now. This website is not an emergency dispatch service.</p>
        </div>
      </section>

      <section className="container feature-grid">
        <div className="feature-card">
          <h3>Police</h3>
          <p>Public safety incidents and law enforcement emergencies.</p>
        </div>
        <div className="feature-card">
          <h3>Fire</h3>
          <p>Fire outbreaks, rescue operations, hazmat and property emergencies.</p>
        </div>
        <div className="feature-card">
          <h3>Medical</h3>
          <p>Urgent health incidents and medical coordination support.</p>
        </div>
        <div className="feature-card">
          <h3>Traffic</h3>
          <p>Road accidents, traffic hazards, and major incident reporting.</p>
        </div>
      </section>
    </div>
  );
}

function AuthForm({ mode }) {
  const { loginUser, registerUser } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password, role: 'CITIZEN' };

      if (mode === 'login') {
        await loginUser(payload);
      } else {
        await registerUser(payload);
      }

      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to complete this request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell auth-shell">
      <div className="container auth-card">
        <h2>{mode === 'login' ? 'Sign in' : 'Create an account'}</h2>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit} className="form-grid">
          {mode !== 'login' && (
            <label>
              Name
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
          )}
          <label>
            Email
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </label>
          <label>
            Password
            <input type="password" name="password" value={form.password} onChange={handleChange} required />
          </label>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}

function CitizenDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    getReports()
      .then((response) => setReports(response.data.data || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-shell container dashboard-shell">
      <div className="card-row">
        <div className="summary-card">
          <h3>Welcome</h3>
          <p>{user?.name}</p>
        </div>
        <div className="summary-card">
          <h3>Active reports</h3>
          <p>{reports.filter((report) => ['SUBMITTED', 'RECEIVED', 'IN_PROGRESS', 'DISPATCHED'].includes(report.status)).length}</p>
        </div>
        <div className="summary-card">
          <h3>Resolved</h3>
          <p>{reports.filter((report) => ['RESOLVED', 'CLOSED'].includes(report.status)).length}</p>
        </div>
      </div>

      <div className="action-row">
        <Link className="primary-button" to="/report">Report Emergency</Link>
      </div>

      <div className="page-section">
        <h2>My emergency reports</h2>
        {loading ? <p>Loading reports...</p> : (
          <div className="list-stack">
            {reports.length === 0 ? <p>No reports found.</p> : reports.map((report) => (
              <Link key={report.id} to={`/reports/${report.id}`} className="report-card">
                <div>
                  <strong>{report.referenceNumber}</strong>
                  <p>{report.title}</p>
                </div>
                <div className="report-meta">
                  <span>{report.emergencyType}</span>
                  <span>{report.status}</span>
                  <span>{report.priority}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReportFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    emergencyType: 'MEDICAL',
    title: '',
    description: '',
    address: '',
    latitude: '',
    longitude: '',
    name: user?.name || '',
    phone: '',
    email: user?.email || '',
    priority: 'MEDIUM',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const useLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
      },
      () => {
        setError('Location access was denied. Please enter your location manually.');
      }
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess(null);

    const hasLatitude = form.latitude !== '';
    const hasLongitude = form.longitude !== '';
    if (hasLatitude !== hasLongitude) {
      setError('Enter both coordinates or leave both blank.');
      return;
    }

    setLoading(true);

    try {
      const { latitude, longitude, ...reportFields } = form;
      const payload = {
        ...reportFields,
        ...(hasLatitude && {
          latitude: Number(latitude),
          longitude: Number(longitude),
        }),
      };

      const response = await createReport(payload);
      setSuccess(response.data.data);
      setTimeout(() => navigate(`/reports/${response.data.data.id}`), 800);
    } catch (err) {
      setError(err.response?.data?.message || 'Emergency report could not be submitted.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell container">
      <div className="page-header">
        <h1>Submit an emergency report</h1>
          <p>Use this form to describe the incident. For immediate danger, call your local emergency number; this form is not an emergency dispatch service.</p>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">Emergency report submitted. Reference: {success.referenceNumber}</div>}
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Emergency type
          <select name="emergencyType" value={form.emergencyType} onChange={handleChange}>
            <option value="POLICE">Police</option>
            <option value="FIRE">Fire</option>
            <option value="MEDICAL">Medical</option>
            <option value="TRAFFIC">Traffic / Accident</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <label>
          Name
          <input name="name" value={form.name} onChange={handleChange} required />
        </label>
        <label>
          Phone
          <input name="phone" value={form.phone} onChange={handleChange} required />
        </label>
        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={handleChange} required />
        </label>
        <label>
          Emergency title
          <input name="title" value={form.title} onChange={handleChange} required />
        </label>
        <label>
          Priority
          <select name="priority" value={form.priority} onChange={handleChange}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </label>
        <label className="full-width">
          Description
          <textarea name="description" value={form.description} onChange={handleChange} rows="5" required />
        </label>
        <label className="full-width">
          Location / address
          <input name="address" value={form.address} onChange={handleChange} required />
        </label>
        <div className="location-grid full-width">
          <label>
            Latitude
            <input type="number" name="latitude" value={form.latitude} onChange={handleChange} step="any" />
          </label>
          <label>
            Longitude
            <input type="number" name="longitude" value={form.longitude} onChange={handleChange} step="any" />
          </label>
        </div>
        <div className="full-width">
          <button type="button" className="secondary-button" onClick={useLocation}>Use My Current Location</button>
        </div>
        <button type="submit" className="primary-button full-width" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Emergency Report'}
        </button>
      </form>
    </div>
  );
}

function ReportDetailPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([getReportById(id), getMessages(id)])
      .then(([reportResponse, messagesResponse]) => {
        setReport(reportResponse.data.data);
        setMessages(messagesResponse.data.data || []);
      })
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [id]);

  const sendReply = async (event) => {
    event.preventDefault();
    if (!messageInput.trim()) return;
    setMessageLoading(true);
    try {
      const response = await sendMessage(id, { message: messageInput });
      setMessages((prev) => [...prev, response.data.data]);
      setMessageInput('');
    } finally {
      setMessageLoading(false);
    }
  };

  if (loading) return <div className="page-shell"><div className="loading-box">Loading report...</div></div>;
  if (!report) return <div className="page-shell container"><h2>Report not found</h2></div>;

  return (
    <div className="page-shell container">
      <div className="page-header">
        <h1>{report.referenceNumber}</h1>
        <p>{report.title}</p>
      </div>
      <div className="detail-grid">
        <div className="detail-card">
          <h3>Report details</h3>
          <ul>
            <li><strong>Type:</strong> {report.emergencyType}</li>
            <li><strong>Status:</strong> {report.status}</li>
            <li><strong>Priority:</strong> {report.priority}</li>
            <li><strong>Department:</strong> {report.department?.name || 'Assigned department'}</li>
            <li><strong>Submitted:</strong> {new Date(report.createdAt).toLocaleString()}</li>
            <li><strong>Location:</strong> {report.address}</li>
          </ul>
        </div>
        <div className="detail-card">
          <h3>Timeline</h3>
          <div className="timeline">
            {['SUBMITTED', 'RECEIVED', 'IN_PROGRESS', 'DISPATCHED', 'RESOLVED', 'CLOSED'].map((stage) => (
              <div key={stage} className={stage === report.status ? 'timeline-step active' : 'timeline-step'}>{stage}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="detail-card message-box">
        <h3>Messages</h3>
        <div className="message-list">
          {messages.length === 0 ? <p>No messages yet.</p> : messages.map((item) => (
            <div key={item.id} className={item.senderId === user?.id ? 'message-item own' : 'message-item'}>
              <strong>{item.senderName || 'System'}</strong>
              <p>{item.message}</p>
              <small>{new Date(item.createdAt).toLocaleString()}</small>
            </div>
          ))}
        </div>
        <form onSubmit={sendReply} className="message-form">
          <textarea value={messageInput} onChange={(event) => setMessageInput(event.target.value)} rows="3" placeholder="Send update or additional information" />
          <button type="submit" className="primary-button" disabled={messageLoading}>{messageLoading ? 'Sending...' : 'Send Message'}</button>
        </form>
      </div>
    </div>
  );
}

function AuthorityDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReports()
      .then((response) => setReports(response.data.data || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-shell container">
      <h1>Authority dashboard</h1>
      {loading ? <p>Loading reports...</p> : (
        <div className="list-stack">
          {reports.map((report) => (
            <Link key={report.id} to={`/authority/reports/${report.id}`} className="report-card">
              <div>
                <strong>{report.referenceNumber}</strong>
                <p>{report.title}</p>
              </div>
              <div className="report-meta">
                <span>{report.emergencyType}</span>
                <span>{report.status}</span>
                <span>{report.priority}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AuthorityReportPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getReportById(id), getMessages(id)])
      .then(([reportResponse, messagesResponse]) => {
        setReport(reportResponse.data.data);
        setMessages(messagesResponse.data.data || []);
        setStatus(reportResponse.data.data.status);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!status) return;
    await updateReportStatus(id, status);
    setReport((prev) => ({ ...prev, status }));
  };

  const submitAuthorReply = async (event) => {
    event.preventDefault();
    if (!messageInput.trim()) return;
    const response = await sendMessage(id, { message: messageInput });
    setMessages((prev) => [...prev, response.data.data]);
    setMessageInput('');
  };

  if (loading) return <div className="page-shell"><div className="loading-box">Loading report...</div></div>;
  if (!report) return <div className="page-shell container"><h2>Report not found</h2></div>;

  return (
    <div className="page-shell container">
      <h1>{report.referenceNumber}</h1>
      <div className="detail-grid">
        <div className="detail-card">
          <h3>Citizen contact</h3>
          <p>{report.name}</p>
          <p>{report.phone}</p>
          <p>{report.email}</p>
          <p>{report.address}</p>
        </div>
        <div className="detail-card">
          <h3>Update status</h3>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <button className="primary-button" onClick={handleStatusUpdate}>Update</button>
        </div>
      </div>
      <div className="detail-card">
        <h3>Messages</h3>
        <div className="message-list">
          {messages.map((item) => (
            <div key={item.id} className="message-item">
              <strong>{item.senderName || 'System'}</strong>
              <p>{item.message}</p>
            </div>
          ))}
        </div>
        <form onSubmit={submitAuthorReply} className="message-form">
          <textarea value={messageInput} onChange={(event) => setMessageInput(event.target.value)} rows="3" placeholder="Add response to the citizen" />
          <button type="submit" className="primary-button">Send</button>
        </form>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    getStatistics()
      .then((response) => setStats(response.data.data))
      .catch(() => setStats(null));
  }, []);

  return (
    <div className="page-shell container">
      <h1>Admin dashboard</h1>
      {stats ? (
        <div className="card-row">
          <div className="summary-card"><h3>Total reports</h3><p>{stats.totalReports}</p></div>
          <div className="summary-card"><h3>Active</h3><p>{stats.activeReports}</p></div>
          <div className="summary-card"><h3>Resolved</h3><p>{stats.resolvedReports}</p></div>
          <div className="summary-card"><h3>Users</h3><p>{stats.totalUsers}</p></div>
          <div className="summary-card"><h3>Authorities</h3><p>{stats.totalAuthorities}</p></div>
          <div className="summary-card"><h3>Departments</h3><p>{stats.totalDepartments}</p></div>
        </div>
      ) : <p>Loading statistics...</p>}
      <div className="action-row">
        <Link className="secondary-button" to="/admin/users">Users</Link>
        <Link className="secondary-button" to="/admin/departments">Departments</Link>
        <Link className="secondary-button" to="/admin/reports">Reports</Link>
        <Link className="secondary-button" to="/admin/audit-logs">Audit Logs</Link>
      </div>
    </div>
  );
}

function AdminUsersPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    getUsers().then((response) => setUsers(response.data.data || [])).catch(() => setUsers([]));
  }, []);

  const changeRole = async (user, role) => {
    const response = await updateUser(user.id, { role });
    setUsers((current) => current.map((entry) => entry.id === user.id ? response.data.data : entry));
  };

  return (
    <div className="page-shell container">
      <h1>Users</h1>
      <div className="list-stack">
        {users.map((user) => (
          <div className="report-card" key={user.id}>
            <div><strong>{user.name}</strong><p>{user.email}</p></div>
            <select value={user.role} onChange={(event) => changeRole(user, event.target.value)}>
              <option value="CITIZEN">CITIZEN</option>
              <option value="AUTHORITY">AUTHORITY</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ code: '', name: '', description: '' });

  useEffect(() => {
    apiGetDepartments();
  }, []);

  const apiGetDepartments = async () => {
    const response = await getDepartments();
    setDepartments(response.data.data || []);
  };

  const addDepartment = async (event) => {
    event.preventDefault();
    const response = await createDepartment(form);
    setDepartments((current) => [...current, response.data.data]);
    setForm({ code: '', name: '', description: '' });
  };

  return (
    <div className="page-shell container">
      <h1>Departments</h1>
      <div className="list-stack">
        {departments.map((department) => <div className="report-card" key={department.id}><strong>{department.name}</strong><span>{department.code}</span></div>)}
      </div>
      <form className="form-grid admin-form" onSubmit={addDepartment}>
        <input placeholder="Code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
        <input placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <input className="full-width" placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <button className="primary-button" type="submit">Add Department</button>
      </form>
    </div>
  );
}

function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  useEffect(() => { getReports().then((response) => setReports(response.data.data || [])).catch(() => setReports([])); }, []);
  return <div className="page-shell container"><h1>All Reports</h1><div className="list-stack">{reports.map((report) => <Link className="report-card" key={report.id} to={`/reports/${report.id}`}><strong>{report.referenceNumber}</strong><span>{report.status}</span></Link>)}</div></div>;
}

function AdminAuditPage() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { getAuditLogs().then((response) => setLogs(response.data.data || [])).catch(() => setLogs([])); }, []);
  return <div className="page-shell container"><h1>Audit Logs</h1><div className="list-stack">{logs.length === 0 ? <p>No audit events recorded.</p> : logs.map((log, index) => <div className="report-card" key={log.id || index}><span>{log.action || 'Event'}</span><span>{log.createdAt || ''}</span></div>)}</div></div>;
}

function NotFoundPage() {
  return <div className="page-shell container"><h1>Page not found</h1><Link to="/">Return home</Link></div>;
}

function AppRouteContent() {
  const { user } = useAuth();

  const dashboardDestination = useMemo(() => {
    if (user?.role === 'ADMIN') return '/admin/dashboard';
    if (user?.role === 'AUTHORITY') return '/authority/dashboard';
    return '/dashboard';
  }, [user]);

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={user ? <Navigate to={dashboardDestination} replace /> : <AuthForm mode="login" />} />
        <Route path="/register" element={user ? <Navigate to={dashboardDestination} replace /> : <AuthForm mode="register" />} />

        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['CITIZEN']}><CitizenDashboard /></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute allowedRoles={['CITIZEN']}><ReportFormPage /></ProtectedRoute>} />
        <Route path="/reports/:id" element={<ProtectedRoute allowedRoles={['CITIZEN', 'AUTHORITY', 'ADMIN']}><ReportDetailPage /></ProtectedRoute>} />

        <Route path="/authority/dashboard" element={<ProtectedRoute allowedRoles={['AUTHORITY']}><AuthorityDashboard /></ProtectedRoute>} />
        <Route path="/authority/reports/:id" element={<ProtectedRoute allowedRoles={['AUTHORITY']}><AuthorityReportPage /></ProtectedRoute>} />

        <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminUsersPage /></ProtectedRoute>} />
        <Route path="/admin/departments" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDepartmentsPage /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminReportsPage /></ProtectedRoute>} />
        <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminAuditPage /></ProtectedRoute>} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MainLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouteContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
