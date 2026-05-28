import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ArtistDetail } from './pages/ArtistDetail'
import { Dashboard } from './pages/Dashboard'
import { MyArtists } from './pages/MyArtists'
import { Search } from './pages/Search'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<Search />} />
        <Route path="/artists" element={<MyArtists />} />
        <Route path="/artist/:id" element={<ArtistDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
