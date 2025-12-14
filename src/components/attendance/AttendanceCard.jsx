import { formatDate } from '../../utils/helpers'

const AttendanceCard = ({ record }) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            {formatDate(record.date)}
          </h3>
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              record.status === 'Present'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : record.status === 'Late'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {record.status}
          </span>
        </div>
      </div>
    </div>
  )
}

export default AttendanceCard