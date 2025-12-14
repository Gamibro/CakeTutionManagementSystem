import { useEffect, useState } from 'react'
import { useTransition, animated } from '@react-spring/web'

const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (message) {
      setShow(true)
      const timer = setTimeout(() => {
        setShow(false)
        if (onClose) onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [message, duration, onClose])

  const transitions = useTransition(show, {
    from: { opacity: 0, transform: 'translateY(20px)' },
    enter: { opacity: 1, transform: 'translateY(0)' },
    leave: { opacity: 0, transform: 'translateY(20px)' },
  })

  const typeClasses = {
    info: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
  }

  return transitions(
    (styles, item) =>
      item && (
        <animated.div
          style={styles}
          className={`fixed bottom-4 right-4 px-4 py-2 rounded-md shadow-md ${typeClasses[type]}`}
        >
          <div className="flex items-center">
            <span className="mr-2">{message}</span>
            <button
              onClick={() => {
                setShow(false)
                if (onClose) onClose()
              }}
              className="ml-2"
            >
              &times;
            </button>
          </div>
        </animated.div>
      )
  )
}

export default Toast