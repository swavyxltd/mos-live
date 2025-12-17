
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      isSuperAdmin: boolean
      staffSubrole?: string
      phone?: string | null
      address?: string | null
      city?: string | null
      postcode?: string | null
      title?: string | null
      giftAidStatus?: string | null
      roleHints?: {
        isOwner: boolean
        orgAdminOf: string[]
        orgStaffOf: string[]
        isParent: boolean
      }
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    isSuperAdmin: boolean
    staffSubrole?: string
    phone?: string | null
    address?: string | null
    city?: string | null
    postcode?: string | null
    title?: string | null
    giftAidStatus?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    isSuperAdmin: boolean
    staffSubrole?: string
    phone?: string | null
    address?: string | null
    city?: string | null
    postcode?: string | null
    title?: string | null
    giftAidStatus?: string | null
    roleHints?: {
      isOwner: boolean
      orgAdminOf: string[]
      orgStaffOf: string[]
      isParent: boolean
    }
  }
}
