import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json()
    
    // Find Juan Antonio Cortez specifically
    const user = await prisma.player.findFirst({
      where: {
        firstName: 'Juan Antonio',
        lastName: 'Cortez'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        pin: true,
        role: true,
        isActive: true
      }
    })
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Usuario no encontrado',
        debug: 'Juan Antonio Cortez not found'
      })
    }
    
    // Test the PIN
    const isValid = user.pin ? await bcrypt.compare(pin, user.pin) : false
    
    return NextResponse.json({
      debug: {
        userFound: true,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        hasPin: !!user.pin,
        pinTested: pin,
        pinValid: isValid,
        pinHashExists: !!user.pin
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      error: 'Debug error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}