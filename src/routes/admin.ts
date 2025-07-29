import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get all appointments for calendar view
router.get('/appointments', async (req: Request, res: Response) => {
  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: [
        { date: 'asc' },
        { time: 'asc' }
      ]
    });

    res.status(200).json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching appointments' 
    });
  }
});

// Get appointments for a specific date range (for calendar view)
router.get('/appointments/calendar', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const appointments = await prisma.appointment.findMany({
      where: {
        AND: [
          startDate ? { date: { gte: startDate as string } } : {},
          endDate ? { date: { lte: endDate as string } } : {}
        ]
      },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' }
      ]
    });

    // Format appointments for calendar view
    const calendarEvents = appointments.map(appointment => ({
      id: appointment.id,
      title: `${appointment.name} - Dr. ${appointment.doctor}`,
      start: `${appointment.date}T${convertTo24Hour(appointment.time || '')}`,
      end: `${appointment.date}T${addMinutes(convertTo24Hour(appointment.time || ''), 30)}`,
      patient: appointment.name,
      contact: appointment.contact,
      doctor: appointment.doctor,
      time: appointment.time
    }));

    res.status(200).json({
      success: true,
      events: calendarEvents
    });
  } catch (error) {
    console.error('Error fetching calendar appointments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching calendar appointments' 
    });
  }
});

// Get appointment by ID
router.get('/appointments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.status(200).json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching appointment' 
    });
  }
});

// Update appointment
router.put('/appointments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, contact, date, time } = req.body;

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        name,
        contact,
        date,
        time
      }
    });

    res.status(200).json({
      success: true,
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating appointment' 
    });
  }
});

// Delete appointment
router.delete('/appointments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.appointment.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting appointment' 
    });
  }
});

// Helper functions
function convertTo24Hour(time12h: string): string {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = '00';
  }
  
  if (modifier === 'PM') {
    hours = (parseInt(hours, 10) + 12).toString();
  }
  
  return `${hours.padStart(2, '0')}:${minutes}:00`;
}

function addMinutes(time24h: string, minutesToAdd: number): string {
  const [hours, minutes] = time24h.split(':').map(num => parseInt(num));
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}:00`;
}

export default router;
