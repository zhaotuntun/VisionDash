/* ================================================================
   data.js — 模拟电商前端项目数据
   ================================================================ */

/* ---------- 组件树数据 ---------- */
const DEMO_COMPONENT_TREE = {
  name:"App", category:"layout",
  children:[
    {name:"Layout",category:"layout",children:[
      {name:"Header",category:"component",children:[
        {name:"Logo",category:"common"},{name:"Navigation",category:"component",children:[
          {name:"NavItem",category:"common"},{name:"DropdownMenu",category:"common"}
        ]},{name:"SearchBar",category:"component"},{name:"CartIcon",category:"common"},{name:"UserMenu",category:"component"}
      ]},
      {name:"Sidebar",category:"layout",children:[
        {name:"CategoryList",category:"component",children:[{name:"CategoryItem",category:"common"}]},
        {name:"FilterPanel",category:"component",children:[
          {name:"PriceRange",category:"common"},{name:"BrandFilter",category:"common"},{name:"RatingFilter",category:"common"}
        ]},{name:"SidebarToggle",category:"common"}
      ]},
      {name:"Footer",category:"component",children:[
        {name:"FooterLinks",category:"common"},{name:"Newsletter",category:"common"},{name:"Copyright",category:"common"}
      ]},
      {name:"MainContent",category:"layout",children:[{name:"RouterOutlet",category:"route"}]}
    ]},
    {name:"Pages",category:"page",children:[
      {name:"HomePage",category:"page",children:[
        {name:"HeroBanner",category:"component"},{name:"FeaturedProducts",category:"component",children:[{name:"ProductCard",category:"common"}]},
        {name:"CategoryShowcase",category:"component"},{name:"DealsSection",category:"component"},{name:"Testimonials",category:"component"}
      ]},
      {name:"ProductsPage",category:"page",children:[
        {name:"ProductGrid",category:"component",children:[{name:"ProductCard",category:"common"}]},
        {name:"Pagination",category:"common"},{name:"SortBar",category:"component"}
      ]},
      {name:"ProductDetailPage",category:"page",children:[
        {name:"ImageGallery",category:"component"},{name:"ProductInfo",category:"component"},
        {name:"AddToCartButton",category:"common"},{name:"ReviewList",category:"component",children:[{name:"ReviewItem",category:"common"}]},
        {name:"RelatedProducts",category:"component"}
      ]},
      {name:"CartPage",category:"page",children:[
        {name:"CartItemList",category:"component",children:[{name:"CartItem",category:"common"}]},
        {name:"CartSummary",category:"component"},{name:"PromoCode",category:"common"},{name:"CheckoutButton",category:"common"}
      ]},
      {name:"CheckoutPage",category:"page",children:[
        {name:"ShippingForm",category:"component"},{name:"PaymentForm",category:"component"},
        {name:"OrderSummary",category:"component"},{name:"PlaceOrderButton",category:"common"}
      ]},
      {name:"UserPage",category:"page",children:[
        {name:"LoginForm",category:"component"},{name:"RegisterForm",category:"component"},
        {name:"UserProfile",category:"component"},{name:"OrderHistory",category:"component",children:[{name:"OrderItem",category:"common"}]},
        {name:"AddressBook",category:"component"}
      ]},
      {name:"AdminPage",category:"page",children:[
        {name:"Dashboard",category:"component",children:[{name:"SalesChart",category:"component"},{name:"StatsCards",category:"common"},{name:"RecentOrders",category:"component"}]},
        {name:"ProductManager",category:"component",children:[{name:"ProductTable",category:"component"},{name:"ProductForm",category:"component"}]},
        {name:"UserManager",category:"component",children:[{name:"UserTable",category:"component"}]}
      ]}
    ]},
    {name:"Common",category:"common",children:[
      {name:"Button",category:"common"},{name:"Modal",category:"common"},{name:"Toast",category:"common"},
      {name:"Loading",category:"common"},{name:"ErrorBoundary",category:"common"},{name:"LazyImage",category:"common"},
      {name:"Badge",category:"common"},{name:"Breadcrumb",category:"common"},{name:"Tabs",category:"common"},{name:"Accordion",category:"common"}
    ]},
    {name:"Store",category:"store",children:[
      {name:"AuthStore",category:"store"},{name:"CartStore",category:"store"},{name:"ProductStore",category:"store"},
      {name:"OrderStore",category:"store"},{name:"UIStore",category:"store"}
    ]}
  ]
};

/* ---------- 依赖关系图数据 ---------- */
const DEMO_DEPENDENCY = {
  nodes:[
    {id:"App",category:"layout",size:18},{id:"Header",category:"component",size:10},{id:"Sidebar",category:"layout",size:8},
    {id:"Footer",category:"component",size:6},{id:"Router",category:"route",size:14},
    {id:"HomePage",category:"page",size:12},{id:"ProductsPage",category:"page",size:11},{id:"CartPage",category:"page",size:9},
    {id:"CheckoutPage",category:"page",size:10},{id:"UserPage",category:"page",size:9},{id:"AdminPage",category:"page",size:11},
    {id:"ProductCard",category:"common",size:14},{id:"Button",category:"common",size:16},{id:"Modal",category:"common",size:10},
    {id:"Toast",category:"common",size:8},{id:"Loading",category:"common",size:12},
    {id:"AuthStore",category:"store",size:10},{id:"CartStore",category:"store",size:12},{id:"ProductStore",category:"store",size:11},
    {id:"OrderStore",category:"store",size:8},{id:"UIStore",category:"store",size:7},
    {id:"useAuth",category:"hook",size:7},{id:"useCart",category:"hook",size:7},{id:"useProduct",category:"hook",size:6},
    {id:"ApiService",category:"service",size:9},{id:"AuthService",category:"service",size:6},{id:"PaymentService",category:"service",size:5},
    {id:"SearchBar",category:"component",size:7},{id:"ImageGallery",category:"component",size:6},{id:"ProductGrid",category:"component",size:8},
    {id:"LazyImage",category:"common",size:8}
  ],
  links:[
    {source:"App",target:"Header"},{source:"App",target:"Sidebar"},{source:"App",target:"Footer"},{source:"App",target:"Router"},
    {source:"Router",target:"HomePage"},{source:"Router",target:"ProductsPage"},{source:"Router",target:"CartPage"},
    {source:"Router",target:"CheckoutPage"},{source:"Router",target:"UserPage"},{source:"Router",target:"AdminPage"},
    {source:"HomePage",target:"ProductCard"},{source:"ProductsPage",target:"ProductCard"},{source:"ProductsPage",target:"ProductGrid"},
    {source:"CartPage",target:"CartStore"},{source:"CartPage",target:"Button"},
    {source:"CheckoutPage",target:"OrderStore"},{source:"CheckoutPage",target:"PaymentService"},
    {source:"UserPage",target:"AuthStore"},{source:"UserPage",target:"useAuth"},
    {source:"AdminPage",target:"ProductStore"},{source:"AdminPage",target:"OrderStore"},
    {source:"Header",target:"SearchBar"},{source:"Header",target:"useAuth"},{source:"Header",target:"useCart"},
    {source:"ProductCard",target:"Button"},{source:"ProductCard",target:"LazyImage"},
    {source:"useAuth",target:"AuthStore"},{source:"useAuth",target:"AuthService"},
    {source:"useCart",target:"CartStore"},{source:"useCart",target:"ApiService"},
    {source:"useProduct",target:"ProductStore"},{source:"useProduct",target:"ApiService"},
    {source:"AuthStore",target:"ApiService"},{source:"CartStore",target:"ApiService"},{source:"ProductStore",target:"ApiService"},
    {source:"OrderStore",target:"ApiService"},{source:"AuthService",target:"ApiService"},
    {source:"ProductGrid",target:"ProductCard"},{source:"ProductGrid",target:"Loading"},
    {source:"SearchBar",target:"ProductStore"},{source:"SearchBar",target:"Loading"},
    {source:"HomePage",target:"Button"},{source:"HomePage",target:"Loading"},
    {source:"Modal",target:"Button"},{source:"ImageGallery",target:"Loading"}
  ]
};

/* ---------- 路由层级数据 ---------- */
const DEMO_ROUTES = {
  name:"/",path:"/",component:"App",category:"layout",
  children:[
    {name:"home",path:"/",component:"HomePage",category:"page",size:3},
    {name:"products",path:"/products",component:"ProductsPage",category:"page",size:2,children:[
      {name:":id",path:"/products/:id",component:"ProductDetailPage",category:"page",size:1},
      {name:"category",path:"/products/category/:slug",component:"CategoryPage",category:"page",size:1}
    ]},
    {name:"cart",path:"/cart",component:"CartPage",category:"page",size:1},
    {name:"checkout",path:"/checkout",component:"CheckoutPage",category:"page",size:1,children:[
      {name:"shipping",path:"/checkout/shipping",component:"ShippingStep",category:"page",size:1},
      {name:"payment",path:"/checkout/payment",component:"PaymentStep",category:"page",size:1},
      {name:"confirm",path:"/checkout/confirm",component:"ConfirmStep",category:"page",size:1}
    ]},
    {name:"user",path:"/user",component:"UserPage",category:"page",size:1,children:[
      {name:"login",path:"/user/login",component:"LoginForm",category:"page",size:1},
      {name:"register",path:"/user/register",component:"RegisterForm",category:"page",size:1},
      {name:"profile",path:"/user/profile",component:"UserProfile",category:"page",size:1},
      {name:"orders",path:"/user/orders",component:"OrderHistory",category:"page",size:1,children:[
        {name:":id",path:"/user/orders/:id",component:"OrderDetail",category:"page",size:1}
      ]},
      {name:"addresses",path:"/user/addresses",component:"AddressBook",category:"page",size:1}
    ]},
    {name:"admin",path:"/admin",component:"AdminPage",category:"page",size:1,children:[
      {name:"dashboard",path:"/admin/dashboard",component:"Dashboard",category:"page",size:2},
      {name:"products",path:"/admin/products",component:"ProductManager",category:"page",size:1,children:[
        {name:"new",path:"/admin/products/new",component:"ProductForm",category:"page",size:1},
        {name:":id/edit",path:"/admin/products/:id/edit",component:"ProductForm",category:"page",size:1}
      ]},
      {name:"users",path:"/admin/users",component:"UserManager",category:"page",size:1},
      {name:"orders",path:"/admin/orders",component:"OrderManager",category:"page",size:1}
    ]},
    {name:"about",path:"/about",component:"AboutPage",category:"page",size:1},
    {name:"contact",path:"/contact",component:"ContactPage",category:"page",size:1},
    {name:"404",path:"*",component:"NotFoundPage",category:"page",size:1}
  ]
};

/* ---------- 模块矩形树图数据（按文件大小） ---------- */
const DEMO_TREEMAP = {
  name:"src",category:"layout",
  children:[
    {name:"pages",category:"page",children:[
      {name:"HomePage.jsx",size:4200,category:"page"},{name:"ProductsPage.jsx",size:3800,category:"page"},
      {name:"ProductDetailPage.jsx",size:5100,category:"page"},{name:"CartPage.jsx",size:3200,category:"page"},
      {name:"CheckoutPage.jsx",size:4600,category:"page"},{name:"UserPage.jsx",size:2800,category:"page"},
      {name:"AdminPage.jsx",size:3500,category:"page"},{name:"AboutPage.jsx",size:1200,category:"page"},
      {name:"ContactPage.jsx",size:1800,category:"page"},{name:"NotFoundPage.jsx",size:600,category:"page"}
    ]},
    {name:"components",category:"component",children:[
      {name:"Header.jsx",size:2800,category:"component"},{name:"Footer.jsx",size:1600,category:"component"},
      {name:"Sidebar.jsx",size:2200,category:"component"},{name:"SearchBar.jsx",size:1900,category:"component"},
      {name:"ProductCard.jsx",size:2400,category:"component"},{name:"ProductGrid.jsx",size:1800,category:"component"},
      {name:"ImageGallery.jsx",size:3200,category:"component"},{name:"CartItem.jsx",size:1500,category:"component"},
      {name:"ReviewList.jsx",size:2100,category:"component"},{name:"Navigation.jsx",size:1700,category:"component"},
      {name:"FilterPanel.jsx",size:2600,category:"component"},{name:"SalesChart.jsx",size:3800,category:"component"}
    ]},
    {name:"common",category:"common",children:[
      {name:"Button.jsx",size:1200,category:"common"},{name:"Modal.jsx",size:1800,category:"common"},
      {name:"Toast.jsx",size:900,category:"common"},{name:"Loading.jsx",size:600,category:"common"},
      {name:"ErrorBoundary.jsx",size:800,category:"common"},{name:"LazyImage.jsx",size:1100,category:"common"},
      {name:"Badge.jsx",size:400,category:"common"},{name:"Breadcrumb.jsx",size:700,category:"common"},
      {name:"Tabs.jsx",size:1300,category:"common"},{name:"Accordion.jsx",size:1000,category:"common"},
      {name:"Pagination.jsx",size:900,category:"common"},{name:"Dropdown.jsx",size:1100,category:"common"}
    ]},
    {name:"store",category:"store",children:[
      {name:"AuthStore.js",size:2200,category:"store"},{name:"CartStore.js",size:2800,category:"store"},
      {name:"ProductStore.js",size:3100,category:"store"},{name:"OrderStore.js",size:2400,category:"store"},
      {name:"UIStore.js",size:1200,category:"store"}
    ]},
    {name:"hooks",category:"hook",children:[
      {name:"useAuth.js",size:1400,category:"hook"},{name:"useCart.js",size:1200,category:"hook"},
      {name:"useProduct.js",size:1100,category:"hook"},{name:"useDebounce.js",size:300,category:"hook"},
      {name:"useLocalStorage.js",size:500,category:"hook"},{name:"useIntersection.js",size:600,category:"hook"}
    ]},
    {name:"services",category:"service",children:[
      {name:"ApiService.js",size:2800,category:"service"},{name:"AuthService.js",size:1600,category:"service"},
      {name:"PaymentService.js",size:1400,category:"service"},{name:"ImageService.js",size:900,category:"service"}
    ]},
    {name:"utils",category:"util",children:[
      {name:"helpers.js",size:1200,category:"util"},{name:"validators.js",size:800,category:"util"},
      {name:"formatters.js",size:600,category:"util"},{name:"constants.js",size:400,category:"util"}
    ]},
    {name:"styles",category:"style",children:[
      {name:"globals.css",size:2400,category:"style"},{name:"variables.css",size:800,category:"style"},
      {name:"animations.css",size:1200,category:"style"},{name:"components.css",size:3200,category:"style"}
    ]}
  ]
};

/* ---------- 数据流向图数据 ---------- */
const DEMO_DATAFLOW = {
  nodes:[
    {id:"UserClick",label:"用户操作",category:"action",layer:0},
    {id:"APIRequest",label:"API请求",category:"action",layer:0},
    {id:"FormSubmit",label:"表单提交",category:"action",layer:0},
    {id:"dispatch",label:"Dispatch",category:"util",layer:1},
    {id:"AuthAction",label:"Auth Action",category:"store",layer:2},
    {id:"CartAction",label:"Cart Action",category:"store",layer:2},
    {id:"ProductAction",label:"Product Action",category:"store",layer:2},
    {id:"OrderAction",label:"Order Action",category:"store",layer:2},
    {id:"AuthReducer",label:"Auth Reducer",category:"store",layer:3},
    {id:"CartReducer",label:"Cart Reducer",category:"store",layer:3},
    {id:"ProductReducer",label:"Product Reducer",category:"store",layer:3},
    {id:"OrderReducer",label:"Order Reducer",category:"store",layer:3},
    {id:"Store",label:"Redux Store",category:"store",layer:4},
    {id:"AuthSelector",label:"Auth Selector",category:"hook",layer:5},
    {id:"CartSelector",label:"Cart Selector",category:"hook",layer:5},
    {id:"ProductSelector",label:"Product Selector",category:"hook",layer:5},
    {id:"Header_C",label:"Header",category:"component",layer:6},
    {id:"ProductList_C",label:"ProductList",category:"component",layer:6},
    {id:"Cart_C",label:"CartPage",category:"component",layer:6},
    {id:"UserPage_C",label:"UserPage",category:"component",layer:6}
  ],
  links:[
    {source:"UserClick",target:"dispatch",value:5},{source:"APIRequest",target:"dispatch",value:3},{source:"FormSubmit",target:"dispatch",value:2},
    {source:"dispatch",target:"AuthAction",value:3},{source:"dispatch",target:"CartAction",value:4},
    {source:"dispatch",target:"ProductAction",value:3},{source:"dispatch",target:"OrderAction",value:2},
    {source:"AuthAction",target:"AuthReducer",value:3},{source:"CartAction",target:"CartReducer",value:4},
    {source:"ProductAction",target:"ProductReducer",value:3},{source:"OrderAction",target:"OrderReducer",value:2},
    {source:"AuthReducer",target:"Store",value:3},{source:"CartReducer",target:"Store",value:4},
    {source:"ProductReducer",target:"Store",value:3},{source:"OrderReducer",target:"Store",value:2},
    {source:"Store",target:"AuthSelector",value:3},{source:"Store",target:"CartSelector",value:4},{source:"Store",target:"ProductSelector",value:3},
    {source:"AuthSelector",target:"Header_C",value:2},{source:"AuthSelector",target:"UserPage_C",value:2},
    {source:"CartSelector",target:"Header_C",value:1},{source:"CartSelector",target:"Cart_C",value:3},
    {source:"ProductSelector",target:"ProductList_C",value:3},{source:"ProductSelector",target:"Header_C",value:1}
  ]
};
