import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { palette, categoryMeta } from '../theme/tokens';
import type { Product } from '../types/b2b';
import { money, percent } from '../utils/format';
import { resolveTier } from '../utils/pricing';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface ProductCardProps {
  product: Product;
  /** Quantity currently in the quote cart (0 when absent). */
  quantityInCart: number;
  onAdd: () => void;
  onRequestQuote: () => void;
}

/** Catalog row: SKU identity, MOQ guard, live tier pricing and quick actions. */
export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantityInCart,
  onAdd,
  onRequestQuote,
}) => {
  const reference = quantityInCart > 0 ? quantityInCart : product.moq;
  const activeTier = resolveTier(product, reference) ?? { minQuantity: product.moq, unitPrice: product.basePrice };
  const activePrice = activeTier.unitPrice;
  const discountPct =
    product.basePrice > 0 ? ((product.basePrice - activePrice) / product.basePrice) * 100 : 0;

  return (
    <View className="rounded-card border border-brand-border bg-white p-3">
      <View className="flex-row">
        <View className="h-11 w-11 items-center justify-center rounded-xl border border-brand-border bg-brand-bg">
          <Ionicons
            name={categoryMeta[product.category].icon as keyof typeof Ionicons.glyphMap}
            size={19}
            color={palette.primary}
          />
        </View>

        <View className="ml-2.5 flex-1">
          <Text className="text-[12px] font-black leading-tight text-brand-text" numberOfLines={2}>
            {product.name}
          </Text>
          <View className="mt-0.5 flex-row items-center">
            <Text className="font-mono text-[9px] text-brand-muted">{product.sku}</Text>
            <Text className="mx-1 text-[9px] text-brand-border">•</Text>
            <Text className="text-[9px] text-brand-muted">{categoryMeta[product.category].label}</Text>
          </View>
          <Text className="mt-0.5 text-[9px] text-brand-muted" numberOfLines={1}>
            {product.description}
          </Text>
        </View>
      </View>

      <View className="mt-2 flex-row items-center">
        <Badge
          label={`MOQ: Min. ${product.moq} ${product.unit}`}
          className="bg-brand-primary border-brand-primary"
          textClassName="text-white"
        />
        <View className="ml-1.5">
          <Badge
            label={`Stok: ${product.stockQuantity}`}
            className="bg-brand-bg border-brand-border"
            textClassName="text-brand-muted"
          />
        </View>
        {quantityInCart > 0 ? (
          <View className="ml-1.5 flex-row items-center rounded-full bg-brand-accent/20 px-1.5 py-[2px]">
            <Ionicons name="cart" size={8} color={palette.primary} />
            <Text className="ml-0.5 text-[9px] font-bold text-brand-primary">
              {quantityInCart} sepette
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mt-2 flex-row rounded-xl border border-brand-border bg-brand-bg p-1.5">
        {product.priceTiers.map((tier, index) => {
          const isActive = tier.minQuantity === activeTier.minQuantity;
          return (
            <View
              key={`${product.id}-tier-${tier.minQuantity}`}
              className={`flex-1 items-center rounded-lg py-1 ${
                isActive ? 'bg-brand-accent/20' : ''
              } ${index > 0 ? 'border-l border-brand-border' : ''}`}
            >
              <Text className="text-[8px] font-semibold text-brand-muted">{tier.minQuantity}+</Text>
              <Text
                className={`font-mono text-[10px] font-bold ${
                  isActive ? 'text-brand-primary' : 'text-brand-text'
                }`}
              >
                {money(tier.unitPrice, 0)}
              </Text>
            </View>
          );
        })}
      </View>

      <View className="mt-2.5 flex-row items-end justify-between">
        <View>
          <Text className="text-[8px] uppercase tracking-label text-brand-muted">
            Anlaşmalı liste fiyatı
          </Text>
          <View className="flex-row items-baseline">
            <Text className="text-[17px] font-black text-brand-primary">{money(activePrice, 0)}</Text>
            <Text className="ml-0.5 text-[9px] text-brand-muted">/ {product.unit}</Text>
          </View>
          {discountPct > 0 ? (
            <Text className="text-[8px] font-semibold text-brand-supporting">
              Liste fiyatından {percent(discountPct, 1)} avantaj
            </Text>
          ) : (
            <Text className="text-[8px] text-brand-muted">Kademeli fiyat uygulanır</Text>
          )}
        </View>

        <View className="flex-row items-center">
          <Pressable
            onPress={onRequestQuote}
            accessibilityRole="button"
            className="mr-1.5 rounded-lg border border-brand-primary px-2.5 py-2"
          >
            <Text className="text-[10px] font-bold text-brand-primary">Teklif İste</Text>
          </Pressable>
          <Button label="Sepete" icon="add" size="sm" onPress={onAdd} />
        </View>
      </View>
    </View>
  );
};
