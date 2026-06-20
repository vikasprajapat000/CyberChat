import { useState, useEffect } from 'react';
import { HardDrive, File, Image, Video, Music, FileText, Trash2, RefreshCw, Search, X, AlertTriangle } from 'lucide-react';

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
};

const getFileIcon = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return <Image size={16} className="file-icon-image" />;
  if (['mp4','webm','mov'].includes(ext)) return <Video size={16} className="file-icon-video" />;
  if (['mp3','ogg','wav'].includes(ext)) return <Music size={16} className="file-icon-audio" />;
  if (['pdf','doc','docx','txt'].includes(ext)) return <FileText size={16} className="file-icon-doc" />;
  return <File size={16} className="file-icon-default" />;
};

export default function StorageManager({ apiBase }) {
  const [files, setFiles] = useState([]);
  const [totalSize, setTotalSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState('');
  const token = localStorage.getItem('cc_token');

  const fetchStorage = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/api/admin/storage`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFiles(data.files || []);
        setTotalSize(data.totalSize || 0);
      }
    } catch (e) {
      setError('Failed to load storage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStorage(); }, []);

  const deleteFile = async (filename) => {
    setDeleting(filename);
    try {
      const res = await fetch(`${apiBase}/api/admin/storage/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFiles(prev => prev.filter(f => f.name !== filename));
        setTotalSize(prev => prev - (files.find(f => f.name === filename)?.size || 0));
      }
    } catch (e) {
      setError('Failed to delete file');
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  // Stats
  const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name));
  const videoFiles = files.filter(f => /\.(mp4|webm|mov)$/i.test(f.name));
  const audioFiles = files.filter(f => /\.(mp3|ogg|wav)$/i.test(f.name));
  const docFiles = files.filter(f => /\.(pdf|doc|docx|txt|zip)$/i.test(f.name));

  return (
    <div className="storage-manager">
      {/* Stats cards */}
      <div className="storage-stats-grid">
        <div className="storage-stat-card total">
          <HardDrive size={20} />
          <div>
            <div className="storage-stat-value">{formatSize(totalSize)}</div>
            <div className="storage-stat-label">Total Used</div>
          </div>
        </div>
        <div className="storage-stat-card">
          <Image size={18} />
          <div>
            <div className="storage-stat-value">{imageFiles.length}</div>
            <div className="storage-stat-label">Images</div>
          </div>
        </div>
        <div className="storage-stat-card">
          <Video size={18} />
          <div>
            <div className="storage-stat-value">{videoFiles.length}</div>
            <div className="storage-stat-label">Videos</div>
          </div>
        </div>
        <div className="storage-stat-card">
          <File size={18} />
          <div>
            <div className="storage-stat-value">{files.length}</div>
            <div className="storage-stat-label">Total Files</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="storage-toolbar">
        <div className="storage-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')}><X size={13} /></button>}
        </div>
        <button className="storage-refresh-btn" onClick={fetchStorage} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {error && <div className="storage-error"><AlertTriangle size={14} />{error}</div>}

      {/* File list */}
      {loading ? (
        <div className="storage-loading">
          <RefreshCw size={30} className="spin" />
          <p>Loading files...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="storage-empty">
          <HardDrive size={40} opacity={0.2} />
          <p>{search ? 'No files match your search' : 'No uploaded files'}</p>
        </div>
      ) : (
        <div className="storage-file-list">
          {filtered.map(file => (
            <div key={file.name} className="storage-file-item">
              <div className="storage-file-icon">{getFileIcon(file.name)}</div>
              <div className="storage-file-info">
                <div className="storage-file-name" title={file.name}>
                  {file.name.length > 35 ? file.name.slice(0, 32) + '...' : file.name}
                </div>
                <div className="storage-file-meta">
                  <span>{formatSize(file.size)}</span>
                  <span className="storage-dot">·</span>
                  <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="storage-file-actions">
                <a
                  href={`${apiBase}${file.url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="storage-view-btn"
                >
                  View
                </a>
                <button
                  className="storage-delete-btn"
                  onClick={() => setConfirmDelete(file.name)}
                  disabled={deleting === file.name}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="storage-confirm-overlay">
          <div className="storage-confirm-modal">
            <AlertTriangle size={24} className="storage-confirm-icon" />
            <h4>Delete File?</h4>
            <p>This will permanently delete <strong>{confirmDelete}</strong>. This cannot be undone.</p>
            <div className="storage-confirm-actions">
              <button className="storage-confirm-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="storage-confirm-delete"
                onClick={() => deleteFile(confirmDelete)}
                disabled={deleting === confirmDelete}
              >
                {deleting === confirmDelete ? 'Deleting...' : 'Delete File'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
