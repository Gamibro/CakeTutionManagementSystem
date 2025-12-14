// // src/components/auth/LoginForm.js
// import { useForm } from 'react-hook-form';
// import Button from '../common/Button';

// const LoginForm = ({ onSubmit, loading }) => {
//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//   } = useForm();

//   return (
//     <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
//       <div className="rounded-md shadow-sm space-y-4">
//         <div>
//           <label htmlFor="username" className="sr-only">
//             Username
//           </label>
//           <input
//             id="username"
//             name="username"
//             type="text"
//             required
//             {...register('username', { required: 'Username is required' })}
//             className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//             placeholder="Username"
//           />
//           {errors.username && (
//             <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
//           )}
//         </div>
//         <div>
//           <label htmlFor="password" className="sr-only">
//             Password
//           </label>
//           <input
//             id="password"
//             name="password"
//             type="password"
//             autoComplete="current-password"
//             required
//             {...register('password', { required: 'Password is required' })}
//             className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
//             placeholder="Password"
//           />
//           {errors.password && (
//             <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
//           )}
//         </div>
//       </div>


//       <div className="flex items-center justify-between">
//         <div className="flex items-center">
//           <input
//             id="remember-me"
//             name="remember-me"
//             type="checkbox"
//             className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
//           />
//           <label
//             htmlFor="remember-me"
//             className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
//           >
//             Remember me
//           </label>
//         </div>

//         <div className="text-sm">
//           <a
//             href="#"
//             className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
//           >
//             Forgot your password?
//           </a>
//         </div>
//       </div>

//       <div>
//         <Button
//           type="submit"
//           variant="primary"
//           className="w-full"
//           disabled={loading}
//         >
//           {loading ? 'Signing in...' : 'Sign in'}
//         </Button>
//       </div>
//     </form>
//   );
// };

// export default LoginForm;