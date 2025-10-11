
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      isSuperAdmin: boolean
      staffSubrole?: string
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
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    isSuperAdmin: boolean
    staffSubrole?: string
    roleHints?: {
      isOwner: boolean
      orgAdminOf: string[]
      orgStaffOf: string[]
      isParent: boolean
    }
  }
}
