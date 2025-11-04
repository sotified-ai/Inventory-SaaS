from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import firebase_admin
from firebase_admin import credentials, auth

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize Firebase Admin (for token verification)
try:
    firebase_admin.get_app()
except ValueError:
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": "saas-inventory-a55fb",
        "private_key_id": "dummy",
        "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4/M2bS1+fWIcPm15j9sM9FNj2aJd9pr6r7VZjd7VqGaW+3xZ0qNj\n-----END PRIVATE KEY-----\n",
        "client_email": "firebase-adminsdk@saas-inventory-a55fb.iam.gserviceaccount.com",
        "client_id": "dummy",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
    })
    firebase_admin.initialize_app(cred)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    email: str
    business_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: str
    business_name: Optional[str] = None

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    sku: str
    selling_price: float
    cost_price: float
    stock: int
    min_stock: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    sku: str
    selling_price: float
    cost_price: float
    initial_stock: int
    min_stock: int

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    selling_price: Optional[float] = None
    cost_price: Optional[float] = None
    min_stock: Optional[int] = None

class RestockRequest(BaseModel):
    product_id: str
    quantity: int

class InvoiceItem(BaseModel):
    product_id: str
    product_name: str
    sku: str
    quantity: int
    unit_price: float
    total: float

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    user_id: str
    items: List[InvoiceItem]
    subtotal: float
    total: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SaleRequest(BaseModel):
    items: List[Dict[str, Any]]  # [{product_id, quantity}]

# Auth dependency
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.split('Bearer ')[1]
    try:
        # In production, verify with Firebase
        # For now, we'll accept any token and extract user_id from it
        # decoded_token = auth.verify_id_token(token)
        # user_id = decoded_token['uid']
        
        # Simplified: assume token is the user_id for development
        user_id = token
        return user_id
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

# Routes
@api_router.get("/")
async def root():
    return {"message": "Inventory & Billing System API"}

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    user = User(
        id=str(uuid.uuid4()),
        email=user_data.email,
        business_name=user_data.business_name
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user

@api_router.get("/users/me", response_model=User)
async def get_current_user_profile(user_id: str = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

# Product routes
@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, user_id: str = Depends(get_current_user)):
    product = Product(
        user_id=user_id,
        name=product_data.name,
        sku=product_data.sku,
        selling_price=product_data.selling_price,
        cost_price=product_data.cost_price,
        stock=product_data.initial_stock,
        min_stock=product_data.min_stock
    )
    
    doc = product.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.products.insert_one(doc)
    return product

@api_router.get("/products", response_model=List[Product])
async def get_products(user_id: str = Depends(get_current_user)):
    products = await db.products.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    for product in products:
        if isinstance(product['created_at'], str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
        if isinstance(product['updated_at'], str):
            product['updated_at'] = datetime.fromisoformat(product['updated_at'])
    
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str, user_id: str = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id, "user_id": user_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if isinstance(product['created_at'], str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    if isinstance(product['updated_at'], str):
        product['updated_at'] = datetime.fromisoformat(product['updated_at'])
    
    return Product(**product)

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductUpdate, user_id: str = Depends(get_current_user)):
    existing = await db.products.find_one({"id": product_id, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = {k: v for k, v in product_data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.products.update_one(
        {"id": product_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated['updated_at'], str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return Product(**updated)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user_id: str = Depends(get_current_user)):
    result = await db.products.delete_one({"id": product_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}

@api_router.post("/products/restock")
async def restock_product(restock_data: RestockRequest, user_id: str = Depends(get_current_user)):
    product = await db.products.find_one({"id": restock_data.product_id, "user_id": user_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    new_stock = product['stock'] + restock_data.quantity
    
    await db.products.update_one(
        {"id": restock_data.product_id, "user_id": user_id},
        {"$set": {"stock": new_stock, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Stock updated successfully", "new_stock": new_stock}

# Sales routes
@api_router.post("/sales", response_model=Invoice)
async def create_sale(sale_data: SaleRequest, user_id: str = Depends(get_current_user)):
    # Validate and prepare invoice items
    invoice_items = []
    subtotal = 0.0
    
    for item in sale_data.items:
        product = await db.products.find_one({"id": item['product_id'], "user_id": user_id})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item['product_id']} not found")
        
        if product['stock'] < item['quantity']:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product['name']}")
        
        item_total = product['selling_price'] * item['quantity']
        invoice_items.append(InvoiceItem(
            product_id=product['id'],
            product_name=product['name'],
            sku=product['sku'],
            quantity=item['quantity'],
            unit_price=product['selling_price'],
            total=item_total
        ))
        subtotal += item_total
    
    # Generate invoice number
    invoice_count = await db.invoices.count_documents({"user_id": user_id})
    invoice_number = f"INV-{invoice_count + 1:05d}"
    
    # Create invoice
    invoice = Invoice(
        invoice_number=invoice_number,
        user_id=user_id,
        items=invoice_items,
        subtotal=subtotal,
        total=subtotal
    )
    
    # Deduct stock atomically
    for item in sale_data.items:
        await db.products.update_one(
            {"id": item['product_id'], "user_id": user_id},
            {
                "$inc": {"stock": -item['quantity']},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
    
    # Save invoice
    doc = invoice.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['items'] = [item.model_dump() for item in invoice_items]
    
    await db.invoices.insert_one(doc)
    return invoice

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(user_id: str = Depends(get_current_user)):
    invoices = await db.invoices.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for invoice in invoices:
        if isinstance(invoice['created_at'], str):
            invoice['created_at'] = datetime.fromisoformat(invoice['created_at'])
    
    return invoices

@api_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str, user_id: str = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id, "user_id": user_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if isinstance(invoice['created_at'], str):
        invoice['created_at'] = datetime.fromisoformat(invoice['created_at'])
    
    return Invoice(**invoice)

# Dashboard stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user_id: str = Depends(get_current_user)):
    total_products = await db.products.count_documents({"user_id": user_id})
    
    # Low stock products
    low_stock_products = await db.products.find(
        {"user_id": user_id, "$expr": {"$lt": ["$stock", "$min_stock"]}},
        {"_id": 0}
    ).to_list(1000)
    
    # Recent sales
    recent_sales = await db.invoices.count_documents({"user_id": user_id})
    
    # Total revenue
    invoices = await db.invoices.find({"user_id": user_id}, {"_id": 0, "total": 1}).to_list(10000)
    total_revenue = sum(inv['total'] for inv in invoices)
    
    return {
        "total_products": total_products,
        "low_stock_count": len(low_stock_products),
        "low_stock_products": low_stock_products,
        "total_sales": recent_sales,
        "total_revenue": total_revenue
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()