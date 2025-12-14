import { formatDate } from "../../utils/helpers";
import { getFileType } from "../../utils/helpers";


const resolveMaterialId = (material) => {
  return material?.id ?? null;
};

const MaterialCard = ({ material }) => {
  const downloadHref =
    material.downloadUrl ??
    material.downloadHref ??
    material.filePath ??
    material.FilePath ??
    "";
  const fileType =
    material.fileType ??
    material.FileType ??
    (material.filePath ? getFileType(material.filePath) : "File");

  const mid = resolveMaterialId(material);
  const serverDownloadAvailable = Boolean(mid);
  
  const handleDocDownload = async(material) => {
    
   const materialId = resolveMaterialId(material);
    
    if (!materialId) {
      console.warn("No material ID found for download");
      return;
    }

     try {
      // Use the backend download endpoint with material ID
      const downloadUrl = `http://localhost:50447/api/studymaterials/download/${materialId}`;
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      // Convert the raw binary response to a blob
      const blob = await response.blob();
      
      // Get filename from content-disposition header or create a default one
      let filename = `material_${materialId}`;
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // If no filename from header, try to get it from material data
      if (!contentDisposition && material) {
        const title = material.title || material.Title || 'material';
        const fileType = material.fileType || material.FileType || 'file';
        filename = `${title}.${fileType}`;
      }

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download failed. Please try again.");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            {material.title}
          </h3>
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
            {fileType}
          </span>
        </div>
        <div className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          {formatDate(material.uploadDate)}
        </div>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-0">
        <dl className="sm:divide-y sm:divide-gray-200 dark:sm:divide-gray-700">
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Description
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
              {material.description || "No description provided"}
            </dd>
          </div>
        </dl>
      </div>
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-4 sm:px-6 text-right">
        <a
          
          onClick={() => handleDocDownload(material)}
          download={Boolean(downloadHref) || undefined}
          className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
            downloadHref ? "" : "pointer-events-none opacity-60"
          }`}
          aria-disabled={!downloadHref}
        >
          Download
        </a>
      </div>
    </div>
  );
};

export default MaterialCard;
