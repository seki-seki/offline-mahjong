import './App.css'
import { ShuffleDemo } from './components/ShuffleDemo'
import { P2PConnection } from './components/P2PConnection'

function App() {
  return (
    <>
      <h1>オフライン麻雀</h1>
      <h2>暗号シャッフルシステム</h2>
      <ShuffleDemo />
      <h2>P2P接続</h2>
      <P2PConnection />
    </>
  )
}

export default App