import { Request, Response } from 'express'
import {
  getBankBalanceSummary,
  getCashInHand,
  getItemSummary,
  getProfitSummary,
  getPurchaseSummary,
  getRemainingAmount,
} from '../services/dashboard.service'
import { getCashOpeningBalance } from '../services/report.service'

export const getItemSummaryController = async (req: Request, res: Response) => {
  try {
    const data = await getItemSummary()
    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching item summary:', error)
    res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
}

export const getRemainingAmountController = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await getRemainingAmount()
    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching item summary:', error)
    res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
}

// export const getCashInHandController = async (req: Request, res: Response) => {
//   try {
//     const data = await getCashInHand()
//     res.status(200).json(data)
//   } catch (error) {
//     console.error('Error fetching item summary:', error)
//     res.status(500).json({ success: false, message: 'Internal Server Error' })
//   }
// }

export const getCashInHandController = async (req: Request, res: Response) => {
  try {
    // Use today's date
    const today = new Date().toISOString().split('T')[0] // "YYYY-MM-DD"

    // closingFlag is fixed as false
    const closingFlag = false

    const data = await getCashOpeningBalance({
      date: today,
      closingFlag,
    })

    res.json(data)
  } catch (error) {
    console.error('Error fetching cash report:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export const getProfitSummaryController = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await getProfitSummary()
    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching profit summary:', error)
    res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
}

export const getBankBalanceSummaryController = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await getBankBalanceSummary()
    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching bank account balance summary:', error)
    res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
}

export const getPurchaseSummaryController = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await getPurchaseSummary()

    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching purchase summary:', error)

    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase summary.',
    })
  }
}
