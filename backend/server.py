from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import firebase_admin
from firebase_admin import credentials, auth
import hashlib
import hmac
import base64
import time

from sqlalchemy import String, Float, Integer, DateTime, Boolean, select, update, delete, func, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.engine.url import make_url
import aiomysql

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MySQL (SQLAlchemy async) connection
DATABASE_URL = os.environ.get('MYSQL_URL')
if not DATABASE_URL:
    # Fallback: construct MySQL URL from discrete DB_* env vars (Django-style)
    db_engine = os.environ.get('DB_ENGINE', '').lower()
    db_name = os.environ.get('DB_NAME')
    db_user = os.environ.get('DB_USER')
    db_password = os.environ.get('DB_PASSWORD')
    db_host = os.environ.get('DB_HOST', 'localhost')
    db_port = os.environ.get('DB_PORT', '3306')

    if db_engine != 'mysql':
        raise RuntimeError(
            "MYSQL_URL is not set and DB_ENGINE is not 'mysql'. Set MYSQL_URL or valid DB_* env vars."
        )
    if not (db_name and db_user and db_password):
        raise RuntimeError(
            "Missing DB_* env vars. Required: DB_NAME, DB_USER, DB_PASSWORD (optional: DB_HOST, DB_PORT)."
        )
    DATABASE_URL = f"mysql+aiomysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# Ensure database exists (create if missing)
async def ensure_database_exists():
    url = make_url(DATABASE_URL)
    db_name = url.database
    host = url.host or 'localhost'
    port = url.port or 3306
    user = url.username or ''
    password = url.password or ''

    try:
        # Connect to server without selecting a specific database
        conn = await aiomysql.connect(host=host, port=port, user=user, password=password, autocommit=True)
        try:
            async with conn.cursor() as cur:
                await cur.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        finally:
            conn.close()
        logger.info(f"Verified database '{db_name}' exists (created if missing)")
    except Exception as e:
        logger.error(f"Failed to ensure database exists: {e}. Ensure the MySQL user has CREATE DATABASE privilege or create '{db_name}' manually.")

class Base(DeclarativeBase):
    pass

# Authentication Users Table
class AuthUserModel(Base):
    __tablename__ = "auth_users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="admin")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class UserModel(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(255))
    business_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class ProductModel(Base):
    __tablename__ = "products"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    sku: Mapped[str] = mapped_column(String(100))
    selling_price: Mapped[float] = mapped_column(Float)
    cost_price: Mapped[float] = mapped_column(Float)
    stock: Mapped[int] = mapped_column(Integer)
    min_stock: Mapped[int] = mapped_column(Integer)
    category_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    packing_unit: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class InvoiceModel(Base):
    __tablename__ = "invoices"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    customer_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    customer_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    deliveryman_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    subtotal: Mapped[float] = mapped_column(Float)
    total: Mapped[float] = mapped_column(Float)
    discount_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    final_discount_amount: Mapped[float] = mapped_column(Float, default=0.0)
    final_total_amount: Mapped[float] = mapped_column(Float)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    sale_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

class InvoiceItemModel(Base):
    __tablename__ = "invoice_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    invoice_id: Mapped[str] = mapped_column(String(36), index=True)
    product_id: Mapped[str] = mapped_column(String(36), index=True)
    product_name: Mapped[str] = mapped_column(String(255))
    sku: Mapped[str] = mapped_column(String(100))
    quantity: Mapped[int] = mapped_column(Integer)
    price_per_unit: Mapped[float] = mapped_column(Float)
    unit_price: Mapped[float] = mapped_column(Float)
    discount: Mapped[float] = mapped_column(Float, default=0.0)
    total_line_price: Mapped[float] = mapped_column(Float)
    total: Mapped[float] = mapped_column(Float)
    bonus_quantity: Mapped[int] = mapped_column(Integer, default=0)
    returned_quantity: Mapped[int] = mapped_column(Integer, default=0)

# Initialize Firebase Admin (for token verification) - optional in development
firebase_available = False
try:
    firebase_admin.get_app()
    firebase_available = True
except ValueError:
    # Skip Firebase initialization in development mode
    logger.info("Firebase not initialized - using development mode authentication")
    firebase_available = False

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Authentication token management (HMAC-based, no external deps)
APP_SECRET = os.environ.get("APP_SECRET", "inventory-saas-secret-key-change-in-production")

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token(username: str, expires_in: int = 12 * 3600) -> str:
    """Generate HMAC-signed token"""
    exp = int(time.time()) + expires_in
    payload = f"{username}:{exp}"
    sig = hmac.new(APP_SECRET.encode(), payload.encode(), hashlib.sha256).digest()
    token = base64.urlsafe_b64encode(f"{payload}:{base64.urlsafe_b64encode(sig).decode()}".encode()).decode()
    return token

def verify_token(token: str) -> str:
    """Verify HMAC token and return username"""
    try:
        raw = base64.urlsafe_b64decode(token).decode()
        parts = raw.split(":")
        if len(parts) != 3:
            raise ValueError("Invalid token format")
        username, exp_str, sig_b64 = parts
        exp = int(exp_str)
        if exp < int(time.time()):
            raise ValueError("Token expired")
        expected_sig = base64.urlsafe_b64encode(
            hmac.new(APP_SECRET.encode(), f"{username}:{exp}".encode(), hashlib.sha256).digest()
        ).decode()
        if not hmac.compare_digest(sig_b64, expected_sig):
            raise ValueError("Signature mismatch")
        return username
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# Models
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    username: str

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
    category_id: Optional[int] = None
    packing_unit: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    sku: str
    selling_price: float
    cost_price: float
    initial_stock: int
    min_stock: int
    category_id: Optional[int] = None
    packing_unit: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    selling_price: Optional[float] = None
    cost_price: Optional[float] = None
    min_stock: Optional[int] = None
    category_id: Optional[int] = None
    packing_unit: Optional[str] = None

class RestockRequest(BaseModel):
    product_id: str
    quantity: int

class Category(BaseModel):
    id: Optional[int] = None
    name: str
    user_id: Optional[str] = None

class InvoiceItem(BaseModel):
    product_id: str
    product_name: str
    sku: str
    quantity: int
    unit_price: float
    price_per_unit: Optional[float] = None
    discount: Optional[float] = 0.0
    total: float
    total_line_price: Optional[float] = None
    bonus_quantity: Optional[int] = 0
    returned_quantity: Optional[int] = 0

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    user_id: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    deliveryman_name: Optional[str] = None
    items: List[InvoiceItem]
    subtotal: float
    total: float
    discount_percentage: Optional[float] = 0.0
    final_discount_amount: Optional[float] = 0.0
    final_total_amount: Optional[float] = None
    is_deleted: Optional[bool] = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    sale_timestamp: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class SaleRequest(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    deliveryman_name: Optional[str] = None
    discount_percentage: Optional[float] = 0.0
    items: List[Dict[str, Any]]  # [{product_id, quantity, discount, bonus_quantity, returned_quantity}]

class SaleUpdateRequest(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    deliveryman_name: Optional[str] = None
    discount_percentage: Optional[float] = 0.0
    items: List[Dict[str, Any]]  # new items replacing old

# Auth dependency
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.split('Bearer ')[1]
    try:
        # Try to verify as HMAC token first (MySQL auth)
        username = verify_token(token)
        # For MySQL auth, we use a fixed user_id pattern
        return f"mysql-{username}"
    except HTTPException:
        # Fallback to simple token as user_id for development/Firebase compatibility
        return token

# Routes
@api_router.get("/")
async def root():
    return {"message": "Inventory & Billing System API"}

@api_router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    """Authenticate user and return token"""
    async with SessionLocal() as session:
        res = await session.execute(select(AuthUserModel).where(AuthUserModel.username == payload.username))
        user = res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        # Verify password
        expected_hash = hash_password(payload.password)
        if not hmac.compare_digest(user.password_hash, expected_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        # Generate token
        token = generate_token(payload.username)
        return LoginResponse(token=token, username=payload.username)

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    user = User(
        id=str(uuid.uuid4()),
        email=user_data.email,
        business_name=user_data.business_name
    )
    async with SessionLocal() as session:
        await session.execute(
            UserModel.__table__.insert().values(
                id=user.id,
                email=user.email,
                business_name=user.business_name,
                created_at=user.created_at
            )
        )
        await session.commit()
    return user

@api_router.get("/users/me", response_model=User)
async def get_current_user_profile(user_id: str = Depends(get_current_user)):
    async with SessionLocal() as session:
        result = await session.execute(select(UserModel).where(UserModel.id == user_id))
        row = result.scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return User(
            id=row.id,
            email=row.email,
            business_name=row.business_name,
            created_at=row.created_at
        )

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
        min_stock=product_data.min_stock,
        category_id=product_data.category_id,
        packing_unit=product_data.packing_unit
    )
    async with SessionLocal() as session:
        await session.execute(
            ProductModel.__table__.insert().values(
                id=str(uuid.uuid4()),
                user_id=product.user_id,
                name=product.name,
                sku=product.sku,
                selling_price=product.selling_price,
                cost_price=product.cost_price,
                stock=product.stock,
                min_stock=product.min_stock,
                category_id=product.category_id,
                packing_unit=product.packing_unit,
                created_at=product.created_at,
                updated_at=product.updated_at,
            )
        )
        await session.commit()
        # Return with generated id set
        created_id = await session.execute(select(ProductModel.id).order_by(ProductModel.created_at.desc()))
    # quick re-select latest by user
    async with SessionLocal() as session2:
        result = await session2.execute(
            select(ProductModel).where(ProductModel.user_id == user_id).order_by(ProductModel.created_at.desc()).limit(1)
        )
        row = result.scalar_one()
        return Product(
            id=row.id,
            user_id=row.user_id,
            name=row.name,
            sku=row.sku,
            selling_price=row.selling_price,
            cost_price=row.cost_price,
            stock=row.stock,
            min_stock=row.min_stock,
            category_id=row.category_id,
            packing_unit=row.packing_unit,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

@api_router.get("/products", response_model=List[Product])
async def get_products(user_id: str = Depends(get_current_user)):
    async with SessionLocal() as session:
        result = await session.execute(select(ProductModel).where(ProductModel.user_id == user_id))
        rows = result.scalars().all()
        return [
            Product(
                id=r.id,
                user_id=r.user_id,
                name=r.name,
                sku=r.sku,
                selling_price=r.selling_price,
                cost_price=r.cost_price,
                stock=r.stock,
                min_stock=r.min_stock,
                category_id=r.category_id,
                packing_unit=r.packing_unit,
                created_at=r.created_at,
                updated_at=r.updated_at,
            ) for r in rows
        ]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str, user_id: str = Depends(get_current_user)):
    async with SessionLocal() as session:
        result = await session.execute(
            select(ProductModel).where(ProductModel.id == product_id, ProductModel.user_id == user_id)
        )
        row = result.scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Product not found")
        return Product(
            id=row.id,
            user_id=row.user_id,
            name=row.name,
            sku=row.sku,
            selling_price=row.selling_price,
            cost_price=row.cost_price,
            stock=row.stock,
            min_stock=row.min_stock,
            category_id=row.category_id,
            packing_unit=row.packing_unit,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductUpdate, user_id: str = Depends(get_current_user)):
    async with SessionLocal() as session:
        result = await session.execute(
            select(ProductModel).where(ProductModel.id == product_id, ProductModel.user_id == user_id)
        )
        row = result.scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Product not found")
        data = {k: v for k, v in product_data.model_dump().items() if v is not None}
        data['updated_at'] = datetime.now(timezone.utc)
        await session.execute(
            update(ProductModel).where(ProductModel.id == product_id, ProductModel.user_id == user_id).values(**data)
        )
        await session.commit()
        # re-fetch
        result2 = await session.execute(
            select(ProductModel).where(ProductModel.id == product_id)
        )
        r2 = result2.scalar_one()
        return Product(
            id=r2.id,
            user_id=r2.user_id,
            name=r2.name,
            sku=r2.sku,
            selling_price=r2.selling_price,
            cost_price=r2.cost_price,
            stock=r2.stock,
            min_stock=r2.min_stock,
            category_id=r2.category_id,
            packing_unit=r2.packing_unit,
            created_at=r2.created_at,
            updated_at=r2.updated_at,
        )

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user_id: str = Depends(get_current_user)):
    async with SessionLocal() as session:
        result = await session.execute(
            select(ProductModel).where(ProductModel.id == product_id, ProductModel.user_id == user_id)
        )
        row = result.scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Product not found")
        await session.execute(delete(ProductModel).where(ProductModel.id == product_id))
        await session.commit()
    return {"message": "Product deleted successfully"}

@api_router.post("/products/restock")
async def restock_product(restock_data: RestockRequest, user_id: str = Depends(get_current_user)):
    async with SessionLocal() as session:
        result = await session.execute(
            select(ProductModel).where(ProductModel.id == restock_data.product_id, ProductModel.user_id == user_id)
        )
        row = result.scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Product not found")
        new_stock = row.stock + restock_data.quantity
        await session.execute(
            update(ProductModel).where(ProductModel.id == restock_data.product_id).values(
                stock=new_stock,
                updated_at=datetime.now(timezone.utc),
            )
        )
        await session.commit()
        return {"message": "Stock updated successfully", "new_stock": new_stock}

# Category routes
@api_router.get("/categories", response_model=List[Category])
async def get_categories(user_id: str = Depends(get_current_user)):
    """Get all categories for the current user"""
    async with SessionLocal() as session:
        query = text("""
            SELECT id, name, user_id, created_at
            FROM categories
            WHERE user_id = :user_id
            ORDER BY name ASC
        """)
        result = await session.execute(query, {"user_id": user_id})
        rows = result.fetchall()
        return [
            Category(
                id=row[0],
                name=row[1],
                user_id=row[2]
            ) for row in rows
        ]

@api_router.post("/categories", response_model=Category)
async def create_category(category_data: Category, user_id: str = Depends(get_current_user)):
    """Create a new category with user isolation"""
    async with SessionLocal() as session:
        # Check for duplicate category name for this user
        check_query = text("""
            SELECT id FROM categories
            WHERE user_id = :user_id AND name = :name
        """)
        result = await session.execute(check_query, {"user_id": user_id, "name": category_data.name})
        existing = result.fetchone()
        
        if existing:
            raise HTTPException(status_code=400, detail=f"Category '{category_data.name}' already exists")
        
        # Insert new category
        insert_query = text("""
            INSERT INTO categories (name, user_id, created_at)
            VALUES (:name, :user_id, NOW())
        """)
        await session.execute(insert_query, {"name": category_data.name, "user_id": user_id})
        await session.commit()
        
        # Fetch the created category
        select_query = text("""
            SELECT id, name, user_id
            FROM categories
            WHERE user_id = :user_id AND name = :name
        """)
        result = await session.execute(select_query, {"user_id": user_id, "name": category_data.name})
        row = result.fetchone()
        
        return Category(
            id=row[0],
            name=row[1],
            user_id=row[2]
        )

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: int, category_data: Category, user_id: str = Depends(get_current_user)):
    """Update a category (only if owned by current user)"""
    async with SessionLocal() as session:
        # Check ownership
        check_query = text("""
            SELECT id FROM categories
            WHERE id = :category_id AND user_id = :user_id
        """)
        result = await session.execute(check_query, {"category_id": category_id, "user_id": user_id})
        existing = result.fetchone()
        
        if not existing:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Check for duplicate name (excluding current category)
        dup_query = text("""
            SELECT id FROM categories
            WHERE user_id = :user_id AND name = :name AND id != :category_id
        """)
        result = await session.execute(dup_query, {"user_id": user_id, "name": category_data.name, "category_id": category_id})
        duplicate = result.fetchone()
        
        if duplicate:
            raise HTTPException(status_code=400, detail=f"Category '{category_data.name}' already exists")
        
        # Update category
        update_query = text("""
            UPDATE categories
            SET name = :name
            WHERE id = :category_id AND user_id = :user_id
        """)
        await session.execute(update_query, {"name": category_data.name, "category_id": category_id, "user_id": user_id})
        await session.commit()
        
        return Category(
            id=category_id,
            name=category_data.name,
            user_id=user_id
        )

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: int, user_id: str = Depends(get_current_user)):
    """Delete a category (only if owned by current user and not in use)"""
    async with SessionLocal() as session:
        # Check ownership
        check_query = text("""
            SELECT id, name FROM categories
            WHERE id = :category_id AND user_id = :user_id
        """)
        result = await session.execute(check_query, {"category_id": category_id, "user_id": user_id})
        existing = result.fetchone()
        
        if not existing:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Check if any products are using this category
        products_query = text("""
            SELECT COUNT(*) FROM products
            WHERE category_id = :category_id AND user_id = :user_id
        """)
        result = await session.execute(products_query, {"category_id": category_id, "user_id": user_id})
        count = result.scalar()
        
        if count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete category '{existing[1]}' - it is assigned to {count} product(s). Please reassign or remove those products first."
            )
        
        # Delete category
        delete_query = text("""
            DELETE FROM categories
            WHERE id = :category_id AND user_id = :user_id
        """)
        await session.execute(delete_query, {"category_id": category_id, "user_id": user_id})
        await session.commit()
        
        return {"message": "Category deleted successfully"}

# Sales routes
@api_router.post("/sales", response_model=Invoice)
async def create_sale(sale_data: SaleRequest, user_id: str = Depends(get_current_user)):
    async with SessionLocal() as session:
        async with session.begin():
            # Validate and prepare invoice items
            invoice_items: List[InvoiceItem] = []
            subtotal = 0.0
            for item in sale_data.items:
                result = await session.execute(
                    select(ProductModel).where(ProductModel.id == item['product_id'], ProductModel.user_id == user_id)
                )
                product = result.scalar_one_or_none()
                if not product:
                    raise HTTPException(status_code=404, detail=f"Product {item['product_id']} not found")
                
                # Get bonus quantity (default 0)
                bonus_qty = item.get('bonus_quantity', 0)
                total_units = item['quantity'] + bonus_qty
                
                # Validate stock for total units (paid + bonus)
                if product.stock < total_units:
                    raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}. Available: {product.stock}, Required: {total_units} (Qty: {item['quantity']} + Bonus: {bonus_qty})")
                
                # Calculate line item totals (only paid quantity affects price)
                item_discount = item.get('discount', 0.0)
                line_total = product.selling_price * item['quantity']
                line_total_after_discount = line_total - item_discount
                
                invoice_items.append(InvoiceItem(
                    product_id=product.id,
                    product_name=product.name,
                    sku=product.sku,
                    quantity=item['quantity'],
                    unit_price=product.selling_price,
                    price_per_unit=product.selling_price,
                    discount=item_discount,
                    bonus_quantity=bonus_qty,
                    returned_quantity=item.get('returned_quantity', 0),
                    total=line_total,
                    total_line_price=line_total_after_discount
                ))
                subtotal += line_total_after_discount

            # Calculate final totals with discount
            discount_pct = sale_data.discount_percentage or 0.0
            final_discount_amt = subtotal * (discount_pct / 100.0)
            final_total = subtotal - final_discount_amt

            # Generate invoice number
            result_count = await session.execute(select(func.count(InvoiceModel.id)).where(InvoiceModel.user_id == user_id))
            invoice_count = int(result_count.scalar_one())
            invoice_number = f"INV-{invoice_count + 1:05d}"

            # Create invoice with unified fields
            inv_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)
            
            new_invoice = InvoiceModel(
                id=inv_id,
                invoice_number=invoice_number,
                user_id=user_id,
                customer_name=sale_data.customer_name,
                customer_phone=sale_data.customer_phone,
                customer_address=sale_data.customer_address,
                deliveryman_name=sale_data.deliveryman_name,
                subtotal=subtotal,
                total=final_total,
                discount_percentage=discount_pct,
                final_discount_amount=final_discount_amt,
                final_total_amount=final_total,
                is_deleted=False,
                created_at=now,
                sale_timestamp=now
            )
            session.add(new_invoice)

            # Deduct stock and create items
            for idx, item in enumerate(sale_data.items):
                # Deduct total units (paid + bonus) from stock
                bonus_qty = item.get('bonus_quantity', 0)
                total_units = item['quantity'] + bonus_qty
                
                await session.execute(
                    update(ProductModel)
                    .where(ProductModel.id == item['product_id'], ProductModel.user_id == user_id)
                    .values(stock=ProductModel.stock - total_units, updated_at=now)
                )
                
                it = invoice_items[idx]
                new_item = InvoiceItemModel(
                    invoice_id=inv_id,
                    product_id=it.product_id,
                    product_name=it.product_name,
                    sku=it.sku,
                    quantity=it.quantity,
                    unit_price=it.unit_price,
                    price_per_unit=it.price_per_unit,
                    discount=it.discount,
                    bonus_quantity=it.bonus_quantity,
                    returned_quantity=it.returned_quantity,
                    total=it.total,
                    total_line_price=it.total_line_price
                )
                session.add(new_item)

        return Invoice(
            id=inv_id,
            invoice_number=invoice_number,
            user_id=user_id,
            customer_name=sale_data.customer_name,
            customer_phone=sale_data.customer_phone,
            customer_address=sale_data.customer_address,
            deliveryman_name=sale_data.deliveryman_name,
            items=invoice_items,
            subtotal=subtotal,
            total=final_total,
            discount_percentage=discount_pct,
            final_discount_amount=final_discount_amt,
            final_total_amount=final_total,
            created_at=now,
            sale_timestamp=now
        )

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(user_id: str = Depends(get_current_user)):
    async with SessionLocal() as session:
        result = await session.execute(
            select(InvoiceModel).where(InvoiceModel.user_id == user_id).order_by(InvoiceModel.created_at.desc())
        )
        invoices = result.scalars().all()
        out: List[Invoice] = []
        for inv in invoices:
            items_res = await session.execute(
                select(InvoiceItemModel).where(InvoiceItemModel.invoice_id == inv.id)
            )
            items_rows = items_res.scalars().all()
            items = [
                InvoiceItem(
                    product_id=r.product_id,
                    product_name=r.product_name,
                    sku=r.sku,
                    quantity=r.quantity,
                    unit_price=r.unit_price,
                    bonus_quantity=r.bonus_quantity,
                    returned_quantity=r.returned_quantity,
                    total=r.total,
                ) for r in items_rows
            ]
            out.append(
                Invoice(
                    id=inv.id,
                    invoice_number=inv.invoice_number,
                    user_id=inv.user_id,
                    customer_name=inv.customer_name,
                    customer_phone=inv.customer_phone,
                    customer_address=inv.customer_address,
                    deliveryman_name=inv.deliveryman_name,
                    items=items,
                    subtotal=inv.subtotal,
                    total=inv.total,
                    created_at=inv.created_at,
                )
            )
        return out

@api_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str, user_id: str = Depends(get_current_user)):
    async with SessionLocal() as session:
        res = await session.execute(
            select(InvoiceModel).where(InvoiceModel.id == invoice_id, InvoiceModel.user_id == user_id)
        )
        inv = res.scalar_one_or_none()
        if not inv:
            raise HTTPException(status_code=404, detail="Invoice not found")
        items_res = await session.execute(
            select(InvoiceItemModel).where(InvoiceItemModel.invoice_id == inv.id)
        )
        items_rows = items_res.scalars().all()
        items = [
            InvoiceItem(
                product_id=r.product_id,
                product_name=r.product_name,
                sku=r.sku,
                quantity=r.quantity,
                unit_price=r.unit_price,
                price_per_unit=r.price_per_unit,
                discount=r.discount,
                bonus_quantity=r.bonus_quantity,
                returned_quantity=r.returned_quantity,
                total=r.total,
                total_line_price=r.total_line_price
            ) for r in items_rows
        ]
        return Invoice(
            id=inv.id,
            invoice_number=inv.invoice_number,
            user_id=inv.user_id,
            customer_name=inv.customer_name,
            customer_phone=inv.customer_phone,
            customer_address=inv.customer_address,
            deliveryman_name=inv.deliveryman_name,
            items=items,
            subtotal=inv.subtotal,
            total=inv.total,
            discount_percentage=inv.discount_percentage,
            final_discount_amount=inv.final_discount_amount,
            final_total_amount=inv.final_total_amount,
            created_at=inv.created_at,
            sale_timestamp=inv.sale_timestamp
        )

@api_router.put("/sales/{invoice_id}", response_model=Invoice)
async def update_sale(invoice_id: str, sale_data: SaleUpdateRequest, user_id: str = Depends(get_current_user)):
    """Update/Re-finalize existing sale with atomic stock reconciliation"""
    async with SessionLocal() as session:
        async with session.begin():
            # 1. Fetch original invoice
            res = await session.execute(
                select(InvoiceModel).where(InvoiceModel.id == invoice_id, InvoiceModel.user_id == user_id)
            )
            inv = res.scalar_one_or_none()
            if not inv:
                raise HTTPException(status_code=404, detail="Invoice not found")
            
            # 2. Get original items
            items_res = await session.execute(
                select(InvoiceItemModel).where(InvoiceItemModel.invoice_id == invoice_id)
            )
            original_items = items_res.scalars().all()
            
            # 3. REVERSE original stock (add back quantities)
            for orig_item in original_items:
                await session.execute(
                    update(ProductModel)
                    .where(ProductModel.id == orig_item.product_id, ProductModel.user_id == user_id)
                    .values(stock=ProductModel.stock + orig_item.quantity, updated_at=datetime.now(timezone.utc))
                )
            
            # 4. Validate new items and stock availability
            invoice_items: List[InvoiceItem] = []
            subtotal = 0.0
            for item in sale_data.items:
                result = await session.execute(
                    select(ProductModel).where(ProductModel.id == item['product_id'], ProductModel.user_id == user_id)
                )
                product = result.scalar_one_or_none()
                if not product:
                    raise HTTPException(status_code=404, detail=f"Product {item['product_id']} not found")
                if product.stock < item['quantity']:
                    raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}. Available: {product.stock}")
                
                # Calculate line totals
                item_discount = item.get('discount', 0.0)
                line_total = product.selling_price * item['quantity']
                line_total_after_discount = line_total - item_discount
                
                invoice_items.append(InvoiceItem(
                    product_id=product.id,
                    product_name=product.name,
                    sku=product.sku,
                    quantity=item['quantity'],
                    unit_price=product.selling_price,
                    price_per_unit=product.selling_price,
                    discount=item_discount,
                    total=line_total,
                    total_line_price=line_total_after_discount
                ))
                subtotal += line_total_after_discount
            
            # 5. Calculate final totals
            discount_pct = sale_data.discount_percentage or 0.0
            final_discount_amt = subtotal * (discount_pct / 100.0)
            final_total = subtotal - final_discount_amt
            
            # 6. Deduct new stock
            for item in sale_data.items:
                await session.execute(
                    update(ProductModel)
                    .where(ProductModel.id == item['product_id'], ProductModel.user_id == user_id)
                    .values(stock=ProductModel.stock - item['quantity'], updated_at=datetime.now(timezone.utc))
                )
            
            # 7. Delete old invoice items
            await session.execute(
                delete(InvoiceItemModel).where(InvoiceItemModel.invoice_id == invoice_id)
            )
            
            # 8. Create new invoice items
            for it in invoice_items:
                new_item = InvoiceItemModel(
                    invoice_id=invoice_id,
                    product_id=it.product_id,
                    product_name=it.product_name,
                    sku=it.sku,
                    quantity=it.quantity,
                    unit_price=it.unit_price,
                    price_per_unit=it.price_per_unit,
                    discount=it.discount,
                    total=it.total,
                    total_line_price=it.total_line_price
                )
                session.add(new_item)
            
            # 9. Update invoice header
            now = datetime.now(timezone.utc)
            await session.execute(
                update(InvoiceModel)
                .where(InvoiceModel.id == invoice_id)
                .values(
                    customer_name=sale_data.customer_name,
                    customer_phone=sale_data.customer_phone,
                    customer_address=sale_data.customer_address,
                    subtotal=subtotal,
                    total=final_total,
                    discount_percentage=discount_pct,
                    final_discount_amount=final_discount_amt,
                    final_total_amount=final_total,
                    updated_at=now
                )
            )
        
        # Return updated invoice
        return Invoice(
            id=invoice_id,
            invoice_number=inv.invoice_number,
            user_id=user_id,
            customer_name=sale_data.customer_name,
            customer_phone=sale_data.customer_phone,
            customer_address=sale_data.customer_address,
            items=invoice_items,
            subtotal=subtotal,
            total=final_total,
            discount_percentage=discount_pct,
            final_discount_amount=final_discount_amt,
            final_total_amount=final_total,
            created_at=inv.created_at,
            sale_timestamp=inv.sale_timestamp,
            updated_at=now
        )

@api_router.delete("/sales/{invoice_id}")
async def delete_sale(invoice_id: str, user_id: str = Depends(get_current_user)):
    """Soft delete sale and restore stock atomically"""
    async with SessionLocal() as session:
        async with session.begin():
            # 1. Fetch invoice
            res = await session.execute(
                select(InvoiceModel).where(InvoiceModel.id == invoice_id, InvoiceModel.user_id == user_id)
            )
            inv = res.scalar_one_or_none()
            if not inv:
                raise HTTPException(status_code=404, detail="Invoice not found")
            
            # 2. Get invoice items
            items_res = await session.execute(
                select(InvoiceItemModel).where(InvoiceItemModel.invoice_id == invoice_id)
            )
            items = items_res.scalars().all()
            
            # 3. Restore stock (add back quantities)
            for item in items:
                await session.execute(
                    update(ProductModel)
                    .where(ProductModel.id == item.product_id, ProductModel.user_id == user_id)
                    .values(stock=ProductModel.stock + item.quantity, updated_at=datetime.now(timezone.utc))
                )
            
            # 4. Soft delete invoice (mark as deleted)
            await session.execute(
                update(InvoiceModel)
                .where(InvoiceModel.id == invoice_id)
                .values(is_deleted=True, updated_at=datetime.now(timezone.utc))
            )
        
        return {"message": "Sale deleted successfully", "invoice_id": invoice_id}

# Dashboard stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user_id: str = Depends(get_current_user)):
    async with SessionLocal() as session:
        res_count = await session.execute(select(func.count(ProductModel.id)).where(ProductModel.user_id == user_id))
        total_products = int(res_count.scalar_one())
        
        # Low stock
        res_low = await session.execute(
            select(ProductModel).where(ProductModel.user_id == user_id, ProductModel.stock < ProductModel.min_stock)
        )
        low_stock_rows = res_low.scalars().all()
        low_stock_products = [
            {
                "id": r.id,
                "name": r.name,
                "sku": r.sku,
                "stock": r.stock,
                "min_stock": r.min_stock,
            } for r in low_stock_rows
        ]
        
        # Sales count and revenue (exclude deleted invoices)
        res_sales = await session.execute(
            select(func.count(InvoiceModel.id)).where(
                InvoiceModel.user_id == user_id,
                InvoiceModel.is_deleted == False
            )
        )
        recent_sales = int(res_sales.scalar_one())
        
        # Use final_total_amount for revenue calculation
        res_rev = await session.execute(
            select(func.sum(InvoiceModel.final_total_amount)).where(
                InvoiceModel.user_id == user_id,
                InvoiceModel.is_deleted == False
            )
        )
        total_revenue = float(res_rev.scalar() or 0.0)
        
        # Calculate Solid Profit and Total Discount
        solid_profit = 0.0
        total_discount = 0.0
        
        # Get all non-deleted invoices with items
        res_invoices = await session.execute(
            select(InvoiceModel).where(
                InvoiceModel.user_id == user_id,
                InvoiceModel.is_deleted == False
            )
        )
        invoices = res_invoices.scalars().all()
        
        for invoice in invoices:
            # Add invoice-level discount
            total_discount += (invoice.final_discount_amount or 0.0)
            
            # Get invoice items
            res_items = await session.execute(
                select(InvoiceItemModel).where(InvoiceItemModel.invoice_id == invoice.id)
            )
            items = res_items.scalars().all()
            
            for item in items:
                # Add item-level discounts
                total_discount += (item.discount or 0.0)
                
                # Get product to calculate profit
                res_product = await session.execute(
                    select(ProductModel).where(ProductModel.id == item.product_id)
                )
                product = res_product.scalar_one_or_none()
                
                if product:
                    # Solid Profit = (selling_price - cost_price) * quantity
                    profit = (product.selling_price - product.cost_price) * item.quantity
                    solid_profit += profit
        
        return {
            "total_products": total_products,
            "low_stock_count": len(low_stock_products),
            "low_stock_products": low_stock_products,
            "total_sales": recent_sales,
            "total_revenue": total_revenue,
            "solid_profit": solid_profit,
            "total_discount": total_discount,
        }

@api_router.get("/reports/sales_history", response_model=List[Invoice])
async def get_sales_history(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user)
):
    """Get sales history with optional date filtering (GMT+5 timezone)"""
    async with SessionLocal() as session:
        # Build query for non-deleted invoices
        query = select(InvoiceModel).where(
            InvoiceModel.user_id == user_id,
            InvoiceModel.is_deleted == False
        )
        
        # Apply date filters if provided (GMT+5 Pakistan timezone)
        if from_date:
            # Parse date and convert to UTC (GMT+5 means -5 hours to get UTC)
            pkt_offset = timedelta(hours=5)
            from_dt = datetime.fromisoformat(from_date.replace('Z', '+00:00'))
            from_utc = from_dt - pkt_offset
            query = query.where(InvoiceModel.sale_timestamp >= from_utc)
        
        if to_date:
            pkt_offset = timedelta(hours=5)
            to_dt = datetime.fromisoformat(to_date.replace('Z', '+00:00'))
            to_utc = to_dt - pkt_offset
            query = query.where(InvoiceModel.sale_timestamp <= to_utc)
        
        query = query.order_by(InvoiceModel.sale_timestamp.desc())
        
        result = await session.execute(query)
        invoices = result.scalars().all()
        
        out: List[Invoice] = []
        for inv in invoices:
            items_res = await session.execute(
                select(InvoiceItemModel).where(InvoiceItemModel.invoice_id == inv.id)
            )
            items_rows = items_res.scalars().all()
            items = [
                InvoiceItem(
                    product_id=r.product_id,
                    product_name=r.product_name,
                    sku=r.sku,
                    quantity=r.quantity,
                    unit_price=r.unit_price,
                    price_per_unit=r.price_per_unit,
                    discount=r.discount,
                    bonus_quantity=r.bonus_quantity,
                    returned_quantity=r.returned_quantity,
                    total=r.total,
                    total_line_price=r.total_line_price
                ) for r in items_rows
            ]
            out.append(
                Invoice(
                    id=inv.id,
                    invoice_number=inv.invoice_number,
                    user_id=inv.user_id,
                    customer_name=inv.customer_name,
                    customer_phone=inv.customer_phone,
                    customer_address=inv.customer_address,
                    deliveryman_name=inv.deliveryman_name,
                    items=items,
                    subtotal=inv.subtotal,
                    total=inv.total,
                    discount_percentage=inv.discount_percentage,
                    final_discount_amount=inv.final_discount_amount,
                    final_total_amount=inv.final_total_amount,
                    created_at=inv.created_at,
                    sale_timestamp=inv.sale_timestamp,
                    updated_at=inv.updated_at
                )
            )
        return out

@api_router.get("/reports/dashboard_summary")
async def get_dashboard_summary(user_id: str = Depends(get_current_user)):
    """Get dashboard summary with corrected aggregates"""
    async with SessionLocal() as session:
        # Total products
        res_count = await session.execute(select(func.count(ProductModel.id)).where(ProductModel.user_id == user_id))
        total_products = int(res_count.scalar_one())
        
        # Total sales (non-deleted)
        res_sales_count = await session.execute(
            select(func.count(InvoiceModel.id)).where(
                InvoiceModel.user_id == user_id,
                InvoiceModel.is_deleted == False
            )
        )
        total_sales = int(res_sales_count.scalar_one())
        
        # Total revenue from final_total_amount
        res_revenue = await session.execute(
            select(func.sum(InvoiceModel.final_total_amount)).where(
                InvoiceModel.user_id == user_id,
                InvoiceModel.is_deleted == False
            )
        )
        total_revenue = float(res_revenue.scalar() or 0.0)
        
        # Low stock count
        res_low_stock = await session.execute(
            select(func.count(ProductModel.id)).where(
                ProductModel.user_id == user_id,
                ProductModel.stock < ProductModel.min_stock
            )
        )
        low_stock_count = int(res_low_stock.scalar_one())
        
        return {
            "total_products": total_products,
            "total_sales": total_sales,
            "total_revenue": total_revenue,
            "low_stock_count": low_stock_count
        }

@api_router.get("/reports/itemized_sales_summary")
async def get_itemized_sales_summary(
    range: str = Query("today", regex="^(today|yesterday|last_7_days)$"),
    user_id: str = Depends(get_current_user)
):
    """Get itemized sales summary for specified date range (GMT+5 timezone)"""
    async with SessionLocal() as session:
        # Calculate date range based on GMT+5 (Pakistan Standard Time)
        pkt_offset = timedelta(hours=5)
        now_utc = datetime.now(timezone.utc)
        now_pkt = now_utc + pkt_offset
        
        if range == "today":
            # Start of today in PKT, converted to UTC
            start_pkt = now_pkt.replace(hour=0, minute=0, second=0, microsecond=0)
            start_utc = start_pkt - pkt_offset
            end_utc = now_utc
        elif range == "yesterday":
            # Start of yesterday in PKT
            yesterday_pkt = now_pkt - timedelta(days=1)
            start_pkt = yesterday_pkt.replace(hour=0, minute=0, second=0, microsecond=0)
            end_pkt = start_pkt + timedelta(days=1)
            start_utc = start_pkt - pkt_offset
            end_utc = end_pkt - pkt_offset
        else:  # last_7_days
            # Start of 7 days ago in PKT
            seven_days_ago_pkt = now_pkt - timedelta(days=7)
            start_pkt = seven_days_ago_pkt.replace(hour=0, minute=0, second=0, microsecond=0)
            start_utc = start_pkt - pkt_offset
            end_utc = now_utc
        
        # Query to get itemized sales summary
        # Join invoice_items with invoices and products
        # Total quantity sold includes both paid quantity and bonus quantity
        query = text("""
        SELECT 
            p.id as product_id,
            p.name as product_name,
            SUM(ii.quantity + COALESCE(ii.bonus_quantity, 0)) as total_quantity_sold,
            ii.unit_price as unit_price,
            SUM(ii.total_line_price) as total_line_revenue
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        JOIN products p ON ii.product_id = p.id
        WHERE i.user_id = :user_id
          AND i.sale_timestamp >= :start_time
          AND i.sale_timestamp <= :end_time
          AND i.is_deleted = FALSE
        GROUP BY p.id, p.name, ii.unit_price
        ORDER BY total_quantity_sold DESC
        """)
        
        result = await session.execute(
            query,
            {"user_id": user_id, "start_time": start_utc, "end_time": end_utc}
        )
        
        rows = result.fetchall()
        
        items = [
            {
                "product_id": row[0],
                "product_name": row[1],
                "total_quantity_sold": int(row[2] or 0),
                "unit_price": float(row[3] or 0),
                "total_line_revenue": float(row[4] or 0)
            }
            for row in rows
        ]
        
        return {
            "range": range,
            "start_time": start_utc.isoformat(),
            "end_time": end_utc.isoformat(),
            "items": items,
            "total_items": len(items),
            "total_quantity": sum(item["total_quantity_sold"] for item in items),
            "total_revenue": sum(item["total_line_revenue"] for item in items)
        }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    # Ensure DB exists before creating tables
    await ensure_database_exists()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        logger.info("Starting database migration checks...")
        
        # Create categories table if not exists
        try:
            await conn.exec_driver_sql("""
                CREATE TABLE IF NOT EXISTS categories (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    user_id VARCHAR(36) NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_category_per_user (user_id, name),
                    INDEX idx_user_id (user_id)
                )
            """)
            logger.info("✓ Categories table ensured")
        except Exception as e:
            logger.error(f"✗ Failed to create categories table: {e}")
            raise
        
        # Add missing columns to products table
        try:
            await conn.exec_driver_sql("ALTER TABLE products ADD COLUMN category_id INT NULL")
            logger.info("✓ Added category_id column to products table")
        except Exception as e:
            logger.info(f"category_id column check: {e}")
        
        try:
            await conn.exec_driver_sql("ALTER TABLE products ADD COLUMN packing_unit VARCHAR(255) NULL")
            logger.info("✓ Added packing_unit column to products table")
        except Exception as e:
            logger.info(f"packing_unit column check: {e}")
        
        # Add missing columns to invoices table if they don't exist
        try:
            await conn.exec_driver_sql("ALTER TABLE invoices ADD COLUMN customer_phone VARCHAR(50) NULL")
            logger.info("✓ Added customer_phone column to invoices table")
        except Exception as e:
            logger.info(f"customer_phone column check: {e}")
        
        try:
            await conn.exec_driver_sql("ALTER TABLE invoices ADD COLUMN customer_address VARCHAR(500) NULL")
            logger.info("✓ Added customer_address column to invoices table")
        except Exception as e:
            logger.info(f"customer_address column check: {e}")
        
        try:
            await conn.exec_driver_sql("ALTER TABLE invoices ADD COLUMN deliveryman_name VARCHAR(255) NULL")
            logger.info("✓ Added deliveryman_name column to invoices table")
        except Exception as e:
            logger.info(f"deliveryman_name column check: {e}")
        
        try:
            await conn.exec_driver_sql("ALTER TABLE invoices ADD COLUMN discount_percentage FLOAT NULL DEFAULT 0")
            logger.info("✓ Added discount_percentage column to invoices table")
        except Exception as e:
            logger.info(f"discount_percentage column check: {e}")
        
        try:
            await conn.exec_driver_sql("ALTER TABLE invoices ADD COLUMN final_discount_amount FLOAT NULL DEFAULT 0")
            logger.info("✓ Added final_discount_amount column to invoices table")
        except Exception as e:
            logger.info(f"final_discount_amount column check: {e}")
        
        try:
            await conn.exec_driver_sql("ALTER TABLE invoices ADD COLUMN final_total_amount FLOAT NULL")
            logger.info("✓ Added final_total_amount column to invoices table")
        except Exception as e:
            logger.info(f"final_total_amount column check: {e}")
        
        try:
            await conn.exec_driver_sql("ALTER TABLE invoices ADD COLUMN is_deleted BOOLEAN NULL DEFAULT 0")
            logger.info("✓ Added is_deleted column to invoices table")
        except Exception as e:
            logger.info(f"is_deleted column check: {e}")
        
        try:
            await conn.exec_driver_sql("ALTER TABLE invoices ADD COLUMN sale_timestamp DATETIME NULL")
            logger.info("✓ Added sale_timestamp column to invoices table")
        except Exception as e:
            logger.info(f"sale_timestamp column check: {e}")
        
        try:
            await conn.exec_driver_sql("ALTER TABLE invoices ADD COLUMN updated_at DATETIME NULL")
            logger.info("✓ Added updated_at column to invoices table")
        except Exception as e:
            logger.info(f"updated_at column check: {e}")
        
        # Add missing columns to invoice_items table if they don't exist
        try:
            await conn.exec_driver_sql("ALTER TABLE invoice_items ADD COLUMN price_per_unit FLOAT NULL")
            logger.info("✓ Added price_per_unit column to invoice_items table")
        except Exception as e:
            logger.info(f"price_per_unit column check: {e}")
        
        try:
            await conn.exec_driver_sql("ALTER TABLE invoice_items ADD COLUMN discount FLOAT NULL DEFAULT 0")
            logger.info("✓ Added discount column to invoice_items table")
        except Exception as e:
            logger.info(f"discount column check: {e}")
        
        try:
            await conn.exec_driver_sql("ALTER TABLE invoice_items ADD COLUMN bonus_quantity INT NULL DEFAULT 0")
            logger.info("✓ Added bonus_quantity column to invoice_items table")
        except Exception as e:
            logger.info(f"bonus_quantity column check: {e}")
        
        try:
            await conn.exec_driver_sql("ALTER TABLE invoice_items ADD COLUMN returned_quantity INT NULL DEFAULT 0")
            logger.info("✓ Added returned_quantity column to invoice_items table")
        except Exception as e:
            logger.info(f"returned_quantity column check: {e}")
        
        try:
            await conn.exec_driver_sql("ALTER TABLE invoice_items ADD COLUMN total_line_price FLOAT NULL")
            logger.info("✓ Added total_line_price column to invoice_items table")
        except Exception as e:
            logger.info(f"total_line_price column check: {e}")
        
        logger.info("Database migration checks completed successfully!")
    
    # Initialize admin user if not exists
    async with SessionLocal() as session:
        result = await session.execute(select(AuthUserModel).where(AuthUserModel.username == "admin"))
        admin_user = result.scalar_one_or_none()
        
        if not admin_user:
            logger.info("Creating default admin user...")
            admin = AuthUserModel(
                username="admin",
                password_hash=hash_password("admin"),
                role="admin"
            )
            session.add(admin)
            await session.commit()
            logger.info("Admin user created successfully! Username: admin, Password: admin")
        else:
            logger.info("Admin user already exists")
    
    # Seed sample products if none exist
    async with SessionLocal() as session:
        result = await session.execute(select(func.count(ProductModel.id)))
        product_count = int(result.scalar_one())
        
        if product_count == 0:
            logger.info("No products found, seeding sample data...")
            sample_products = [
                ProductModel(
                    id=str(uuid.uuid4()),
                    user_id="mysql-admin",  # Match MySQL auth user ID format
                    name="Wireless Mouse",
                    sku="TECH-001",
                    selling_price=25.99,
                    cost_price=15.50,
                    stock=50,
                    min_stock=10
                ),
                ProductModel(
                    id=str(uuid.uuid4()),
                    user_id="mysql-admin",
                    name="USB-C Cable",
                    sku="TECH-002",
                    selling_price=12.99,
                    cost_price=6.25,
                    stock=100,
                    min_stock=20
                ),
                ProductModel(
                    id=str(uuid.uuid4()),
                    user_id="mysql-admin",
                    name="Bluetooth Headphones",
                    sku="AUDIO-001",
                    selling_price=79.99,
                    cost_price=45.00,
                    stock=25,
                    min_stock=5
                ),
                ProductModel(
                    id=str(uuid.uuid4()),
                    user_id="mysql-admin",
                    name="Laptop Stand",
                    sku="OFFICE-001",
                    selling_price=34.99,
                    cost_price=18.75,
                    stock=30,
                    min_stock=8
                ),
                ProductModel(
                    id=str(uuid.uuid4()),
                    user_id="mysql-admin",
                    name="Coffee Mug",
                    sku="KITCHEN-001",
                    selling_price=8.99,
                    cost_price=3.50,
                    stock=75,
                    min_stock=15
                )
            ]
            
            for product in sample_products:
                session.add(product)
            
            await session.commit()
            logger.info(f"Seeded {len(sample_products)} sample products successfully!")
        else:
            logger.info(f"Database already contains {product_count} products, skipping seed.")