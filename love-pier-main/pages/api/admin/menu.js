import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'data', 'menu.json')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'lovepier2024'

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf-8')
      return res.status(200).json(JSON.parse(data))
    } catch {
      return res.status(500).json({ error: 'Failed to read menu data' })
    }
  }

  if (req.method === 'POST') {
    const { password, menuData } = req.body
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    try {
      const existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
      const updated = { ...existing, ...menuData, lastUpdated: new Date().toISOString().split('T')[0] }
      fs.writeFileSync(DATA_FILE, JSON.stringify(updated, null, 2), 'utf-8')
      return res.status(200).json({ ok: true })
    } catch {
      return res.status(500).json({ error: 'Failed to save menu data' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
