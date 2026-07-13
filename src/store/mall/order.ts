import type { OmsOrder } from '@/types/order'
import { create } from 'zustand'

interface OrderState {
  deliverOrderList: OmsOrder[]
  setDeliverOrderList: (list: OmsOrder[]) => void
}

export const useMallOrderStore = create<OrderState>(set => ({
  deliverOrderList: [],

  setDeliverOrderList: list => set({ deliverOrderList: list }),
}))
