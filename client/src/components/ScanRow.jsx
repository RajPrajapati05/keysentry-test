import { useNavigate } from 'react-router-dom';

export default function ScanRow({ scan }) {
  const navigate = useNavigate();
  const date = new Date(scan.scannedAt).toLocaleString();

  return (
    <tr
      onClick={() => navigate(`/scans/${scan._id}`)}
      className="hover:bg-gray-50 cursor-pointer border-b border-gray-100"
    >
      <td className="px-4 py-3 font-mono text-sm text-gray-700">{scan.repoFullName}</td>
      <td className="px-4 py-3 font-mono text-xs text-gray-400">{scan.commitSha?.slice(0, 7)}</td>
      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{scan.commitMessage}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{scan.pushedBy}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          scan.status === 'flagged'
            ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'
        }`}>
          {scan.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{scan.findingsCount}</td>
      <td className="px-4 py-3 text-xs text-gray-400">{date}</td>
    </tr>
  );
}