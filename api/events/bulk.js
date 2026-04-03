import { connectToDatabase } from '../../lib/mongo.js'
import { Event } from '../../models.js'

export default async function handler(req, res) {
  console.log('🔥 Bulk events endpoint HIT!', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request');
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  console.log('📦 Request body:', JSON.stringify(req.body).substring(0, 200));

  try {
    await connectToDatabase()
    console.log('✅ Database connected');
    return await bulkCreateEvents(req, res)
  } catch (error) {
    console.error('❌ Bulk events API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    })
  }
}

async function bulkCreateEvents(req, res) {
  try {
    const { events } = req.body

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Events array is required and must not be empty'
      })
    }

    // Validate each event
    const validEvents = []
    const errors = []

    events.forEach((eventData, index) => {
      if (!eventData.title || !eventData.date || !eventData.venue) {
        errors.push(`Event at row ${index + 2}: Missing required fields (title, date, or venue)`)
      } else {
        validEvents.push({
          ...eventData,
          createdBy: eventData.createdBy || 'admin',
          description: eventData.description || '',
          time: eventData.time || '00:00'
        })
      }
    })

    if (validEvents.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid events to import',
        details: errors
      })
    }

    // Insert all valid events
    const insertedEvents = await Event.insertMany(validEvents, { ordered: false })

    const response = {
      success: true,
      message: `Successfully imported ${insertedEvents.length} event${insertedEvents.length !== 1 ? 's' : ''}`,
      inserted: insertedEvents.length,
      total: events.length
    }

    if (errors.length > 0) {
      response.warnings = errors
      response.message += `. ${errors.length} event${errors.length !== 1 ? 's' : ''} skipped due to validation errors.`
    }

    return res.status(201).json(response)
  } catch (error) {
    console.error('Error bulk creating events:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to import events',
      details: error.message
    })
  }
}
