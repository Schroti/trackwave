import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ArtistDetail } from './pages/ArtistDetail'
import { Dashboard } from './pages/Dashboard'
import { MyArtists } from './pages/MyArtists'
import { Search } from './pages/Search'
import { useArtistStore } from './store/useArtistStore'

function App() {
  const hydrate = useArtistStore((state) => state.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

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
