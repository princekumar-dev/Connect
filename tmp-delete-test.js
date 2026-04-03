(async ()=>{
  const ports = [3001, 3000]
  for (const port of ports) {
    const base = `http://localhost:${port}`
    try {
      console.log('\nTrying port', port)
      const email = `deletecheck+${port}@example.com`
      let r = await fetch(base + '/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'DeleteCheck', email, password: 'TempDel123!', role: 'staff' })
      })
      console.log('POST status', r.status)
      const text = await r.text()
      console.log('POST body', text)
      try {
        const j = JSON.parse(text)
        if (!j.success) { console.log('Create failed on port', port); continue }
        const uid = j.user.id
        console.log('Created id', uid)
        let del = await fetch(base + '/api/users', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid })
        })
        console.log('DELETE status', del.status)
        const dj = await del.json()
        console.log('DELETE body', JSON.stringify(dj))
        let g = await fetch(base + '/api/users')
        const gj = await g.json()
        console.log('GET count', gj.users.length)
        if (gj.users.find(u => u.id === uid)) { console.error('User still present on port', port) } else { console.log('Delete verified on port', port) }
      } catch (parseErr) {
        console.error('Failed to parse POST response on port', port, parseErr)
      }
    } catch (e) {
      console.error('Error testing port', port, e)
    }
  }
})();
