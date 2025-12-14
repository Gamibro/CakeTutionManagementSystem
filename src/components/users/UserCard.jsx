import Avatar from "../common/Avatar";

const UserCard = ({ user }) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex items-center">
        <div className="flex-shrink-0">
          <Avatar
            name={`${user.firstName} ${user.lastName}`}
            size="lg"
            user={user}
          />
        </div>
        <div className="ml-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            {user.firstName} {user.lastName}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            {user.email}
          </p>
          {user.rollNumber && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Roll No: {user.rollNumber}
            </p>
          )}
          {user.employeeID && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Employee ID: {user.employeeID}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCard;
