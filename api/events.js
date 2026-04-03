import { connectToDatabase } from '../lib/mongo.js'
import { Event, User } from '../models.js'

export default async function handler(req, res) {
  // CORS is already handled by the cors middleware in server.js
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    await connectToDatabase()

    switch (req.method) {
      case 'GET':
        return await getEvents(req, res)
      case 'POST':
        return await createEvent(req, res)
      case 'DELETE':
        return await deleteEvent(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Events API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}

async function getEvents(req, res) {
  try {
    const events = await Event.find().sort({ date: -1 }).lean()
    
    return res.status(200).json({
      success: true,
      events,
      count: events.length
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch events'
    })
  }
}

async function createEvent(req, res) {
  try {
    const eventData = req.body

    if (!eventData.title || !eventData.description || !eventData.date || !eventData.time || !eventData.venue) {
      return res.status(400).json({
        success: false,
        error: 'All required fields must be provided'
      })
    }

    const event = new Event({
      ...eventData,
      createdBy: eventData.createdBy || 'admin'
    })

    await event.save()

    return res.status(201).json({
      success: true,
      event,
      message: 'Event created successfully!'
    })
  } catch (error) {
    console.error('Error creating event:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create event'
    })
  }
}

async function deleteEvent(req, res) {
  try {
    const { eventId } = req.body

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'Event ID is required'
      })
    }

    const event = await Event.findByIdAndDelete(eventId)

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting event:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete event'
    })
  }
}
