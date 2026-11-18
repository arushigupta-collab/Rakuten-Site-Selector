import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom'
import { Shell } from './components/Shell'
import SqCandidates from './screens/SqCandidates'
import SqLibrary from './screens/SqLibrary'
import SqNewRun from './screens/SqNewRun'
import SqPipeline from './screens/SqPipeline'

const router = createHashRouter([
  { path: '/', element: <Navigate to="/sq/new" replace /> },
  {
    path: '/sq',
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to="/sq/new" replace /> },
      { path: 'new', element: <SqNewRun /> },
      { path: 'run/:runId', element: <SqPipeline /> },
      { path: 'run/:runId/candidates', element: <SqCandidates /> },
      { path: 'library', element: <SqLibrary /> },
    ],
  },
  { path: '*', element: <Navigate to="/sq/new" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
