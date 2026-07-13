import { decimal, int, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core'

// ==================== UMS — 用户权限管理 ====================

export const umsAdmin = mysqlTable('ums_admin', {
  id: int('id').autoincrement().primaryKey(),
  username: varchar('username', { length: 64 }).notNull().unique(),
  password: varchar('password', { length: 128 }).notNull(),
  icon: varchar('icon', { length: 500 }),
  email: varchar('email', { length: 100 }),
  nickName: varchar('nick_name', { length: 200 }),
  note: varchar('note', { length: 500 }),
  createTime: varchar('create_time', { length: 32 }),
  loginTime: varchar('login_time', { length: 32 }),
  status: int('status').default(1),
})

export const umsAdminLoginLog = mysqlTable('ums_admin_login_log', {
  id: int('id').autoincrement().primaryKey(),
  adminId: int('admin_id'),
  createTime: varchar('create_time', { length: 32 }),
  ip: varchar('ip', { length: 64 }),
  address: varchar('address', { length: 100 }),
  userAgent: varchar('user_agent', { length: 100 }),
})

export const umsRole = mysqlTable('ums_role', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
  adminCount: int('admin_count').default(0),
  createTime: varchar('create_time', { length: 32 }),
  status: int('status').default(1),
  sort: int('sort').default(0),
})

export const umsMenu = mysqlTable('ums_menu', {
  id: int('id').autoincrement().primaryKey(),
  parentId: int('parent_id').default(0),
  createTime: varchar('create_time', { length: 32 }),
  title: varchar('title', { length: 100 }).notNull(),
  level: int('level').default(0),
  sort: int('sort').default(0),
  name: varchar('name', { length: 200 }),
  icon: varchar('icon', { length: 200 }),
  hidden: int('hidden').default(0),
})

export const umsResource = mysqlTable('ums_resource', {
  id: int('id').autoincrement().primaryKey(),
  createTime: varchar('create_time', { length: 32 }),
  name: varchar('name', { length: 200 }),
  url: varchar('url', { length: 200 }),
  description: varchar('description', { length: 500 }),
  categoryId: int('category_id'),
})

export const umsResourceCategory = mysqlTable('ums_resource_category', {
  id: int('id').autoincrement().primaryKey(),
  createTime: varchar('create_time', { length: 32 }),
  name: varchar('name', { length: 200 }),
  sort: int('sort').default(0),
})

export const umsMemberLevel = mysqlTable('ums_member_level', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }),
  growthPoint: int('growth_point'),
  defaultStatus: int('default_status'),
  freeFreightPoint: decimal('free_freight_point', { precision: 10, scale: 2 }),
  commentGrowthPoint: int('comment_growth_point'),
  priviledgeFreeFreight: int('priviledge_free_freight'),
  priviledgeSignIn: int('priviledge_sign_in'),
  priviledgeComment: int('priviledge_comment'),
  priviledgePromotion: int('priviledge_promotion'),
  priviledgeMemberPrice: int('priviledge_member_price'),
  priviledgeBirthday: int('priviledge_birthday'),
  note: varchar('note', { length: 200 }),
})

// 关联表
export const umsAdminRoleRelation = mysqlTable('ums_admin_role_relation', {
  id: int('id').autoincrement().primaryKey(),
  adminId: int('admin_id').notNull(),
  roleId: int('role_id').notNull(),
})

export const umsRoleMenuRelation = mysqlTable('ums_role_menu_relation', {
  id: int('id').autoincrement().primaryKey(),
  roleId: int('role_id').notNull(),
  menuId: int('menu_id').notNull(),
})

export const umsRoleResourceRelation = mysqlTable('ums_role_resource_relation', {
  id: int('id').autoincrement().primaryKey(),
  roleId: int('role_id').notNull(),
  resourceId: int('resource_id').notNull(),
})

// ==================== PMS — 商品管理 ====================

export const pmsBrand = mysqlTable('pms_brand', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 64 }),
  firstLetter: varchar('first_letter', { length: 8 }),
  sort: int('sort'),
  factoryStatus: int('factory_status'),
  showStatus: int('show_status'),
  productCount: int('product_count'),
  productCommentCount: int('product_comment_count'),
  logo: varchar('logo', { length: 255 }),
  bigPic: varchar('big_pic', { length: 255 }),
  brandStory: text('brand_story'),
})

export const pmsProductCategory = mysqlTable('pms_product_category', {
  id: int('id').autoincrement().primaryKey(),
  parentId: int('parent_id'),
  name: varchar('name', { length: 64 }),
  level: int('level'),
  productCount: int('product_count'),
  productUnit: varchar('product_unit', { length: 64 }),
  navStatus: int('nav_status'),
  showStatus: int('show_status'),
  sort: int('sort'),
  icon: varchar('icon', { length: 255 }),
  keywords: varchar('keywords', { length: 255 }),
  description: text('description'),
})

export const pmsProduct = mysqlTable('pms_product', {
  id: int('id').autoincrement().primaryKey(),
  brandId: int('brand_id'),
  productCategoryId: int('product_category_id'),
  feightTemplateId: int('feight_template_id'),
  productAttributeCategoryId: int('product_attribute_category_id'),
  name: varchar('name', { length: 200 }).notNull(),
  pic: varchar('pic', { length: 255 }),
  productSn: varchar('product_sn', { length: 64 }).notNull(),
  deleteStatus: int('delete_status').default(0),
  publishStatus: int('publish_status').default(0),
  newStatus: int('new_status').default(0),
  recommandStatus: int('recommand_status').default(0),
  verifyStatus: int('verify_status').default(0),
  sort: int('sort').default(0),
  sale: int('sale').default(0),
  price: decimal('price', { precision: 10, scale: 2 }),
  promotionPrice: decimal('promotion_price', { precision: 10, scale: 2 }),
  giftGrowth: int('gift_growth').default(0),
  giftPoint: int('gift_point').default(0),
  usePointLimit: int('use_point_limit'),
  subTitle: varchar('sub_title', { length: 255 }),
  description: text('description'),
  originalPrice: decimal('original_price', { precision: 10, scale: 2 }),
  stock: int('stock'),
  lowStock: int('low_stock'),
  unit: varchar('unit', { length: 16 }),
  weight: decimal('weight', { precision: 10, scale: 2 }),
  previewStatus: int('preview_status'),
  serviceIds: varchar('service_ids', { length: 64 }),
  keywords: varchar('keywords', { length: 255 }),
  note: varchar('note', { length: 255 }),
  albumPics: varchar('album_pics', { length: 255 }),
  detailTitle: varchar('detail_title', { length: 255 }),
  detailDesc: text('detail_desc'),
  detailHtml: text('detail_html'),
  detailMobileHtml: text('detail_mobile_html'),
  promotionStartTime: varchar('promotion_start_time', { length: 32 }),
  promotionEndTime: varchar('promotion_end_time', { length: 32 }),
  promotionPerLimit: int('promotion_per_limit'),
  promotionType: int('promotion_type').default(0),
  brandName: varchar('brand_name', { length: 255 }),
  productCategoryName: varchar('product_category_name', { length: 255 }),
})

export const pmsProductAttributeCategory = mysqlTable('pms_product_attribute_category', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 64 }),
  attributeCount: int('attribute_count').default(0),
  paramCount: int('param_count').default(0),
})

export const pmsProductAttribute = mysqlTable('pms_product_attribute', {
  id: int('id').autoincrement().primaryKey(),
  productAttributeCategoryId: int('product_attribute_category_id'),
  name: varchar('name', { length: 64 }),
  selectType: int('select_type'),
  inputType: int('input_type'),
  inputList: varchar('input_list', { length: 255 }),
  sort: int('sort').default(0),
  filterType: int('filter_type'),
  searchType: int('search_type'),
  relatedStatus: int('related_status'),
  handAddStatus: int('hand_add_status'),
  type: int('type').default(0),
})

export const pmsProductAttributeValue = mysqlTable('pms_product_attribute_value', {
  id: int('id').autoincrement().primaryKey(),
  productId: int('product_id'),
  productAttributeId: int('product_attribute_id'),
  value: varchar('value', { length: 64 }),
})

export const pmsSkuStock = mysqlTable('pms_sku_stock', {
  id: int('id').autoincrement().primaryKey(),
  productId: int('product_id'),
  skuCode: varchar('sku_code', { length: 64 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }),
  stock: int('stock').default(0),
  lowStock: int('low_stock'),
  pic: varchar('pic', { length: 255 }),
  sale: int('sale').default(0),
  promotionPrice: decimal('promotion_price', { precision: 10, scale: 2 }),
  lockStock: int('lock_stock').default(0),
  spData: varchar('sp_data', { length: 500 }),
})

export const pmsProductCategoryAttributeRelation = mysqlTable('pms_product_category_attribute_relation', {
  id: int('id').autoincrement().primaryKey(),
  productCategoryId: int('product_category_id'),
  productAttributeId: int('product_attribute_id'),
})

export const pmsMemberPrice = mysqlTable('pms_member_price', {
  id: int('id').autoincrement().primaryKey(),
  productId: int('product_id'),
  memberLevelId: int('member_level_id'),
  memberPrice: decimal('member_price', { precision: 10, scale: 2 }),
  memberLevelName: varchar('member_level_name', { length: 100 }),
})

export const pmsProductLadder = mysqlTable('pms_product_ladder', {
  id: int('id').autoincrement().primaryKey(),
  productId: int('product_id'),
  count: int('count'),
  discount: decimal('discount', { precision: 10, scale: 2 }),
  price: decimal('price', { precision: 10, scale: 2 }),
})

export const pmsProductFullReduction = mysqlTable('pms_product_full_reduction', {
  id: int('id').autoincrement().primaryKey(),
  productId: int('product_id'),
  fullPrice: decimal('full_price', { precision: 10, scale: 2 }),
  reducePrice: decimal('reduce_price', { precision: 10, scale: 2 }),
})

export const pmsProductOperateLog = mysqlTable('pms_product_operate_log', {
  id: int('id').autoincrement().primaryKey(),
  productId: int('product_id'),
  priceOld: decimal('price_old', { precision: 10, scale: 2 }),
  priceNew: decimal('price_new', { precision: 10, scale: 2 }),
  salePriceOld: decimal('sale_price_old', { precision: 10, scale: 2 }),
  salePriceNew: decimal('sale_price_new', { precision: 10, scale: 2 }),
  giftPointOld: int('gift_point_old'),
  giftPointNew: int('gift_point_new'),
  usePointLimitOld: int('use_point_limit_old'),
  usePointLimitNew: int('use_point_limit_new'),
  operateMan: varchar('operate_man', { length: 64 }),
  createTime: varchar('create_time', { length: 32 }),
})

// ==================== OMS — 订单管理 ====================

export const omsOrder = mysqlTable('oms_order', {
  id: int('id').autoincrement().primaryKey(),
  memberId: int('member_id').notNull(),
  couponId: int('coupon_id'),
  orderSn: varchar('order_sn', { length: 64 }),
  createTime: varchar('create_time', { length: 32 }),
  memberUsername: varchar('member_username', { length: 64 }),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
  payAmount: decimal('pay_amount', { precision: 10, scale: 2 }),
  freightAmount: decimal('freight_amount', { precision: 10, scale: 2 }),
  promotionAmount: decimal('promotion_amount', { precision: 10, scale: 2 }),
  integrationAmount: decimal('integration_amount', { precision: 10, scale: 2 }),
  couponAmount: decimal('coupon_amount', { precision: 10, scale: 2 }),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }),
  payType: int('pay_type'),
  sourceType: int('source_type'),
  status: int('status'),
  orderType: int('order_type'),
  deliveryCompany: varchar('delivery_company', { length: 64 }),
  deliverySn: varchar('delivery_sn', { length: 64 }),
  autoConfirmDay: int('auto_confirm_day'),
  integration: int('integration'),
  growth: int('growth'),
  promotionInfo: varchar('promotion_info', { length: 100 }),
  billType: int('bill_type'),
  billHeader: varchar('bill_header', { length: 200 }),
  billContent: varchar('bill_content', { length: 200 }),
  billReceiverPhone: varchar('bill_receiver_phone', { length: 32 }),
  billReceiverEmail: varchar('bill_receiver_email', { length: 64 }),
  receiverName: varchar('receiver_name', { length: 100 }).notNull(),
  receiverPhone: varchar('receiver_phone', { length: 32 }).notNull(),
  receiverPostCode: varchar('receiver_post_code', { length: 32 }),
  receiverProvince: varchar('receiver_province', { length: 32 }),
  receiverCity: varchar('receiver_city', { length: 32 }),
  receiverRegion: varchar('receiver_region', { length: 32 }),
  receiverDetailAddress: varchar('receiver_detail_address', { length: 200 }),
  note: varchar('note', { length: 500 }),
  confirmStatus: int('confirm_status'),
  deleteStatus: int('delete_status').default(0),
  useIntegration: int('use_integration'),
  paymentTime: varchar('payment_time', { length: 32 }),
  deliveryTime: varchar('delivery_time', { length: 32 }),
  receiveTime: varchar('receive_time', { length: 32 }),
  commentTime: varchar('comment_time', { length: 32 }),
  modifyTime: varchar('modify_time', { length: 32 }),
})

export const omsOrderItem = mysqlTable('oms_order_item', {
  id: int('id').autoincrement().primaryKey(),
  orderId: int('order_id'),
  orderSn: varchar('order_sn', { length: 64 }),
  productId: int('product_id'),
  productPic: varchar('product_pic', { length: 500 }),
  productName: varchar('product_name', { length: 200 }),
  productBrand: varchar('product_brand', { length: 200 }),
  productSn: varchar('product_sn', { length: 64 }),
  productPrice: decimal('product_price', { precision: 10, scale: 2 }),
  productQuantity: int('product_quantity'),
  productSkuId: int('product_sku_id'),
  productSkuCode: varchar('product_sku_code', { length: 64 }),
  productCategoryId: int('product_category_id'),
  promotionName: varchar('promotion_name', { length: 200 }),
  promotionAmount: decimal('promotion_amount', { precision: 10, scale: 2 }),
  couponAmount: decimal('coupon_amount', { precision: 10, scale: 2 }),
  integrationAmount: decimal('integration_amount', { precision: 10, scale: 2 }),
  realAmount: decimal('real_amount', { precision: 10, scale: 2 }),
  giftIntegration: int('gift_integration').default(0),
  giftGrowth: int('gift_growth').default(0),
  productAttr: varchar('product_attr', { length: 500 }),
})

export const omsOrderOperateHistory = mysqlTable('oms_order_operate_history', {
  id: int('id').autoincrement().primaryKey(),
  orderId: int('order_id'),
  operateMan: varchar('operate_man', { length: 100 }),
  createTime: varchar('create_time', { length: 32 }),
  orderStatus: int('order_status'),
  note: varchar('note', { length: 500 }),
})

export const omsOrderReturnApply = mysqlTable('oms_order_return_apply', {
  id: int('id').autoincrement().primaryKey(),
  orderId: int('order_id'),
  companyAddressId: int('company_address_id'),
  productId: int('product_id'),
  orderSn: varchar('order_sn', { length: 64 }),
  createTime: varchar('create_time', { length: 32 }),
  memberUsername: varchar('member_username', { length: 64 }),
  returnAmount: decimal('return_amount', { precision: 10, scale: 2 }),
  returnName: varchar('return_name', { length: 100 }),
  returnPhone: varchar('return_phone', { length: 100 }),
  status: int('status'),
  handleTime: varchar('handle_time', { length: 32 }),
  productPic: varchar('product_pic', { length: 500 }),
  productName: varchar('product_name', { length: 200 }),
  productBrand: varchar('product_brand', { length: 200 }),
  productAttr: varchar('product_attr', { length: 500 }),
  productCount: int('product_count'),
  productPrice: decimal('product_price', { precision: 10, scale: 2 }),
  productRealPrice: decimal('product_real_price', { precision: 10, scale: 2 }),
  reason: varchar('reason', { length: 200 }),
  description: varchar('description', { length: 500 }),
  proofPics: varchar('proof_pics', { length: 1000 }),
  handleNote: varchar('handle_note', { length: 500 }),
  handleMan: varchar('handle_man', { length: 100 }),
  receiveMan: varchar('receive_man', { length: 100 }),
  receiveTime: varchar('receive_time', { length: 32 }),
  receiveNote: varchar('receive_note', { length: 500 }),
})

export const omsOrderReturnReason = mysqlTable('oms_order_return_reason', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }),
  sort: int('sort'),
  status: int('status'),
  createTime: varchar('create_time', { length: 32 }),
})

export const omsOrderSetting = mysqlTable('oms_order_setting', {
  id: int('id').autoincrement().primaryKey(),
  flashOrderOvertime: int('flash_order_overtime'),
  normalOrderOvertime: int('normal_order_overtime'),
  confirmOvertime: int('confirm_overtime'),
  finishOvertime: int('finish_overtime'),
  commentOvertime: int('comment_overtime'),
})

export const omsCompanyAddress = mysqlTable('oms_company_address', {
  id: int('id').autoincrement().primaryKey(),
  addressName: varchar('address_name', { length: 200 }),
  sendStatus: int('send_status'),
  receiveStatus: int('receive_status'),
  name: varchar('name', { length: 64 }),
  phone: varchar('phone', { length: 64 }),
  province: varchar('province', { length: 64 }),
  city: varchar('city', { length: 64 }),
  region: varchar('region', { length: 64 }),
  detailAddress: varchar('detail_address', { length: 200 }),
})

// ==================== SMS — 营销管理 ====================

export const smsCoupon = mysqlTable('sms_coupon', {
  id: int('id').autoincrement().primaryKey(),
  type: int('type'),
  name: varchar('name', { length: 100 }),
  platform: int('platform'),
  count: int('count'),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  perLimit: int('per_limit'),
  minPoint: decimal('min_point', { precision: 10, scale: 2 }),
  startTime: varchar('start_time', { length: 32 }),
  endTime: varchar('end_time', { length: 32 }),
  useType: int('use_type'),
  note: varchar('note', { length: 200 }),
  publishCount: int('publish_count'),
  useCount: int('use_count'),
  receiveCount: int('receive_count'),
  enableTime: varchar('enable_time', { length: 32 }),
  code: varchar('code', { length: 64 }),
  memberLevel: int('member_level'),
})

export const smsCouponHistory = mysqlTable('sms_coupon_history', {
  id: int('id').autoincrement().primaryKey(),
  couponId: int('coupon_id'),
  memberId: int('member_id'),
  couponCode: varchar('coupon_code', { length: 64 }),
  memberNickname: varchar('member_nickname', { length: 64 }),
  getType: int('get_type'),
  createTime: varchar('create_time', { length: 32 }),
  useStatus: int('use_status'),
  useTime: varchar('use_time', { length: 32 }),
  orderId: int('order_id'),
  orderSn: varchar('order_sn', { length: 64 }),
})

export const smsCouponProductRelation = mysqlTable('sms_coupon_product_relation', {
  id: int('id').autoincrement().primaryKey(),
  couponId: int('coupon_id'),
  productId: int('product_id'),
  productName: varchar('product_name', { length: 500 }),
  productSn: varchar('product_sn', { length: 200 }),
})

export const smsCouponProductCategoryRelation = mysqlTable('sms_coupon_product_category_relation', {
  id: int('id').autoincrement().primaryKey(),
  couponId: int('coupon_id'),
  productCategoryId: int('product_category_id'),
  productCategoryName: varchar('product_category_name', { length: 200 }),
  parentCategoryName: varchar('parent_category_name', { length: 200 }),
})

export const smsFlashPromotion = mysqlTable('sms_flash_promotion', {
  id: int('id').autoincrement().primaryKey(),
  title: varchar('title', { length: 200 }),
  startDate: varchar('start_date', { length: 32 }),
  endDate: varchar('end_date', { length: 32 }),
  status: int('status'),
  createTime: varchar('create_time', { length: 32 }),
})

export const smsFlashPromotionSession = mysqlTable('sms_flash_promotion_session', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 200 }),
  startTime: varchar('start_time', { length: 32 }),
  endTime: varchar('end_time', { length: 32 }),
  status: int('status'),
  createTime: varchar('create_time', { length: 32 }),
})

export const smsFlashPromotionProductRelation = mysqlTable('sms_flash_promotion_product_relation', {
  id: int('id').autoincrement().primaryKey(),
  flashPromotionId: int('flash_promotion_id'),
  flashPromotionSessionId: int('flash_promotion_session_id'),
  productId: int('product_id'),
  flashPromotionPrice: decimal('flash_promotion_price', { precision: 10, scale: 2 }),
  flashPromotionCount: int('flash_promotion_count'),
  flashPromotionLimit: int('flash_promotion_limit'),
  sort: int('sort'),
})

export const smsHomeAdvertise = mysqlTable('sms_home_advertise', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }),
  type: int('type'),
  pic: varchar('pic', { length: 500 }),
  startTime: varchar('start_time', { length: 32 }),
  endTime: varchar('end_time', { length: 32 }),
  status: int('status'),
  clickCount: int('click_count'),
  orderCount: int('order_count'),
  url: varchar('url', { length: 500 }),
  note: varchar('note', { length: 500 }),
  sort: int('sort').default(0),
})

export const smsHomeBrand = mysqlTable('sms_home_brand', {
  id: int('id').autoincrement().primaryKey(),
  brandId: int('brand_id'),
  brandName: varchar('brand_name', { length: 255 }),
  recommendStatus: int('recommend_status'),
  sort: int('sort'),
})

export const smsHomeNewProduct = mysqlTable('sms_home_new_product', {
  id: int('id').autoincrement().primaryKey(),
  productId: int('product_id'),
  productName: varchar('product_name', { length: 255 }),
  recommendStatus: int('recommend_status'),
  sort: int('sort'),
})

export const smsHomeRecommendProduct = mysqlTable('sms_home_recommend_product', {
  id: int('id').autoincrement().primaryKey(),
  productId: int('product_id'),
  productName: varchar('product_name', { length: 255 }),
  recommendStatus: int('recommend_status'),
  sort: int('sort'),
})

export const smsHomeRecommendSubject = mysqlTable('sms_home_recommend_subject', {
  id: int('id').autoincrement().primaryKey(),
  subjectId: int('subject_id'),
  subjectName: varchar('subject_name', { length: 255 }),
  recommendStatus: int('recommend_status'),
  sort: int('sort'),
})

// ==================== CMS — 内容管理 ====================

export const cmsSubject = mysqlTable('cms_subject', {
  id: int('id').autoincrement().primaryKey(),
  categoryId: int('category_id'),
  title: varchar('title', { length: 100 }),
  pic: varchar('pic', { length: 500 }),
  productCount: int('product_count'),
  recommendStatus: int('recommend_status'),
  createTime: varchar('create_time', { length: 32 }),
  collectCount: int('collect_count'),
  readCount: int('read_count'),
  commentCount: int('comment_count'),
  albumPics: varchar('album_pics', { length: 1000 }),
  description: varchar('description', { length: 1000 }),
  showStatus: int('show_status'),
  content: text('content'),
  forwardCount: int('forward_count'),
  categoryName: varchar('category_name', { length: 200 }),
})

export const cmsSubjectProductRelation = mysqlTable('cms_subject_product_relation', {
  id: int('id').autoincrement().primaryKey(),
  subjectId: int('subject_id'),
  productId: int('product_id'),
})

export const cmsSubjectCategory = mysqlTable('cms_subject_category', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }),
  icon: varchar('icon', { length: 500 }),
  subjectCount: int('subject_count'),
  showStatus: int('show_status'),
  sort: int('sort'),
})

export const cmsPrefrenceArea = mysqlTable('cms_prefrence_area', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }),
  subTitle: varchar('sub_title', { length: 255 }),
  pic: varchar('pic', { length: 500 }),
  sort: int('sort'),
  showStatus: int('show_status'),
})

export const cmsPrefrenceAreaProductRelation = mysqlTable('cms_prefrence_area_product_relation', {
  id: int('id').autoincrement().primaryKey(),
  prefrenceAreaId: int('prefrence_area_id'),
  productId: int('product_id'),
})
