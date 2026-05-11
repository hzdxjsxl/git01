const { Transform } = require('stream');

class OrderTransform extends Transform {
  constructor(options = {}) {
    super({ objectMode: true });
    this.dateFormat = options.dateFormat || 'ISO';
  }

  _transform(doc, encoding, callback) {
    try {
      const transformed = this.transformOrder(doc);
      this.push(transformed);
      callback();
    } catch (err) {
      callback(err);
    }
  }

  transformOrder(doc) {
    return {
      id: doc._id?.toString(),
      orderNo: doc.orderNo,
      customerId: doc.customerId,
      customerName: doc.customerName,
      totalAmount: this.parseNumber(doc.totalAmount),
      status: doc.status,
      currency: doc.currency || 'CNY',
      orderDate: this.formatDate(doc.orderDate),
      createdAt: this.formatDate(doc.createdAt),
      updatedAt: this.formatDate(doc.updatedAt),
      paymentMethod: doc.paymentMethod,
      paymentDate: this.formatDate(doc.paymentDate),
      shippingAddress: this.transformAddress(doc.shippingAddress),
      items: this.transformItems(doc.items),
      discounts: this.parseNumber(doc.discounts),
      shippingCost: this.parseNumber(doc.shippingCost),
      taxAmount: this.parseNumber(doc.taxAmount),
      notes: doc.notes,
      source: doc.source,
      channel: doc.channel,
      tags: doc.tags || [],
      metadata: doc.metadata
    };
  }

  transformAddress(address) {
    if (!address) return null;
    return {
      fullName: address.fullName,
      phone: address.phone,
      province: address.province,
      city: address.city,
      district: address.district,
      address: address.address,
      postalCode: address.postalCode,
      country: address.country || '中国'
    };
  }

  transformItems(items) {
    if (!Array.isArray(items)) return [];
    return items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: this.parseNumber(item.quantity),
      unitPrice: this.parseNumber(item.unitPrice),
      subtotal: this.parseNumber(item.subtotal),
      discount: this.parseNumber(item.discount),
      taxRate: this.parseNumber(item.taxRate),
      category: item.category,
      brand: item.brand
    }));
  }

  formatDate(date) {
    if (!date) return null;
    
    let parsedDate;
    if (date instanceof Date) {
      parsedDate = date;
    } else if (typeof date === 'number') {
      parsedDate = new Date(date);
    } else if (typeof date === 'string') {
      parsedDate = new Date(date);
    } else {
      return null;
    }
    
    if (isNaN(parsedDate.getTime())) {
      return null;
    }
    
    if (this.dateFormat === 'ISO') {
      return parsedDate.toISOString();
    } else if (this.dateFormat === 'timestamp') {
      return parsedDate.getTime();
    }
    
    return parsedDate.toISOString();
  }

  parseNumber(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof value === 'object' && value.toNumber) {
      return value.toNumber();
    }
    return 0;
  }
}

module.exports = OrderTransform;
