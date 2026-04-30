import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Search, Trash2 } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { drinkImageKeys, pizzaImageKeys, resolveImageSource } from "@/data/menu";
import {
  AdminApiError,
  createAdminProduct,
  createAdminProductOption,
  deleteAdminProductMedia,
  fetchAdminCatalog,
  fetchAdminProductMediaLibrary,
  uploadAdminProductImage,
  updateAdminCrustFlavor,
  updateAdminCrustPrices,
  updateAdminPizzaBasePrices,
  updateAdminProduct,
  updateAdminProductOption,
  type AdminCatalogCategory,
  type AdminCatalogData,
  type AdminCatalogProduct,
  type AdminCatalogProductOption,
  type AdminCrustFlavor,
  type AdminCrustPrices,
  type AdminMediaLibraryItem,
  type AdminPizzaBasePrice,
  type AdminProductType,
} from "@/lib/admin-api";

const CATALOG_QUERY_KEY = ["admin", "catalog"];
const PUBLIC_MENU_QUERY_KEY = ["public-menu"];
const MEDIA_LIBRARY_QUERY_KEY = ["admin", "media-library"];

type ProductDraft = {
  name: string;
  description: string;
  imageKey: string;
  badgeText: string;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: string;
};

type OptionDraft = {
  label: string;
  price: string;
  isActive: boolean;
  sortOrder: string;
};

type PriceDraft = {
  M: string;
  G: string;
  GG: string;
};

type CrustFlavorDraft = {
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: string;
};

type NewProductDraft = {
  categoryCode: string;
  name: string;
  description: string;
  imageKey: string;
  badgeText: string;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: string;
  initialOptionLabel: string;
  initialOptionPrice: string;
  initialOptionIsActive: boolean;
  initialOptionSortOrder: string;
};

type NewOptionDraft = {
  label: string;
  price: string;
  isActive: boolean;
  sortOrder: string;
};

export function AdminCatalogPanel({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | string>("all");
  const [productDrafts, setProductDrafts] = useState<Record<number, ProductDraft>>({});
  const [optionDrafts, setOptionDrafts] = useState<Record<number, OptionDraft>>({});
  const [priceDrafts, setPriceDrafts] = useState<Record<string, PriceDraft>>({});
  const [crustPriceDraft, setCrustPriceDraft] = useState<PriceDraft | null>(null);
  const [crustFlavorDrafts, setCrustFlavorDrafts] = useState<Record<number, CrustFlavorDraft>>({});
  const [newProductDraft, setNewProductDraft] = useState<NewProductDraft>(() =>
    createEmptyProductDraft("", "pizza"),
  );
  const [newOptionDrafts, setNewOptionDrafts] = useState<Record<number, NewOptionDraft>>({});
  const [newProductImageFile, setNewProductImageFile] = useState<File | null>(null);
  const [productImageFiles, setProductImageFiles] = useState<Record<number, File | null>>({});

  const deferredSearch = useDeferredValue(searchInput.trim().toLowerCase());

  const catalogQuery = useQuery({
    queryKey: CATALOG_QUERY_KEY,
    queryFn: () => fetchAdminCatalog(token),
    enabled: Boolean(token),
    retry: false,
  });

  const mediaLibraryQuery = useQuery({
    queryKey: MEDIA_LIBRARY_QUERY_KEY,
    queryFn: () => fetchAdminProductMediaLibrary(token),
    enabled: Boolean(token),
    retry: false,
  });

  const categories = useMemo(() => catalogQuery.data?.categories ?? [], [catalogQuery.data?.categories]);
  const uploadedMediaOptions = useMemo(() => mediaLibraryQuery.data ?? [], [mediaLibraryQuery.data]);
  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        value: category.code,
        label: category.name,
        productType: category.productType,
      })),
    [categories],
  );

  const createCategory =
    categoryOptions.find((category) => category.value === newProductDraft.categoryCode) ??
    categoryOptions[0] ??
    null;
  const createCategoryType = createCategory?.productType ?? "pizza";

  useEffect(() => {
    if (!categoryOptions.length) {
      return;
    }

    const currentCategoryExists = categoryOptions.some(
      (category) => category.value === newProductDraft.categoryCode,
    );

    if (!currentCategoryExists) {
      setNewProductDraft(createEmptyProductDraft(categoryOptions[0].value, categoryOptions[0].productType));
    }
  }, [categoryOptions, newProductDraft.categoryCode]);

  const invalidateCatalog = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: PUBLIC_MENU_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: MEDIA_LIBRARY_QUERY_KEY }),
    ]);
  };

  const createProductMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createAdminProduct>[1]) => createAdminProduct(token, payload),
    onSuccess: async (product) => {
      await invalidateCatalog();

      const nextCategory =
        categoryOptions.find((category) => category.value === product.categoryCode) ?? createCategory;

      setNewProductDraft(
        createEmptyProductDraft(
          nextCategory?.value ?? product.categoryCode,
          nextCategory?.productType ?? product.productType,
        ),
      );
      toast.success(`${product.name} entrou no catalogo.`);
    },
    onError: (error) => {
      toast.error(readCatalogError(error, "Nao foi possivel criar o produto agora."));
    },
  });

  const imageUploadMutation = useMutation({
    mutationFn: (input: { file: File }) => uploadAdminProductImage(token, input.file),
  });

  const deleteMediaMutation = useMutation({
    mutationFn: (fileName: string) => deleteAdminProductMedia(token, fileName),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MEDIA_LIBRARY_QUERY_KEY });
      toast.success("Imagem removida da biblioteca.");
    },
    onError: (error) => {
      toast.error(readCatalogError(error, "Nao foi possivel remover a imagem agora."));
    },
  });

  const handleNewProductImageUpload = async () => {
    if (!newProductImageFile) {
      toast.error("Escolha uma imagem antes de enviar.");
      return;
    }

    try {
      const uploaded = await imageUploadMutation.mutateAsync({ file: newProductImageFile });
      setNewProductDraft((current) => ({
        ...current,
        imageKey: uploaded.imageKey,
      }));
      setNewProductImageFile(null);
      toast.success("Imagem enviada para o backend.");
    } catch (error) {
      toast.error(readCatalogError(error, "Nao foi possivel enviar a imagem agora."));
    }
  };

  const handleProductImageUpload = async (product: AdminCatalogProduct) => {
    const productId = product.id;
    const file = productImageFiles[productId];

    if (!file) {
      toast.error("Escolha uma imagem antes de enviar.");
      return;
    }

    try {
      const uploaded = await imageUploadMutation.mutateAsync({ file });
      setProductDrafts((current) => {
        const currentDraft = current[productId];

        return {
          ...current,
          [productId]: {
            ...(currentDraft ?? toProductDraft(product)),
            imageKey: uploaded.imageKey,
          },
        };
      });
      setProductImageFiles((current) => ({
        ...current,
        [productId]: null,
      }));
      toast.success("Imagem enviada. Agora salve o produto para publicar a troca.");
    } catch (error) {
      toast.error(readCatalogError(error, "Nao foi possivel enviar a imagem agora."));
    }
  };

  const productMutation = useMutation({
    mutationFn: (input: { productId: number; payload: Parameters<typeof updateAdminProduct>[2] }) =>
      updateAdminProduct(token, input.productId, input.payload),
    onSuccess: async (product) => {
      await invalidateCatalog();
      setProductDrafts((current) => {
        const next = { ...current };
        delete next[product.id];
        return next;
      });
      toast.success(`${product.name} atualizado no cardapio.`);
    },
    onError: (error) => {
      toast.error(readCatalogError(error, "Nao foi possivel salvar o produto agora."));
    },
  });

  const createOptionMutation = useMutation({
    mutationFn: (input: {
      productId: number;
      productName: string;
      payload: Parameters<typeof createAdminProductOption>[1];
    }) => createAdminProductOption(token, input.payload),
    onSuccess: async (_, variables) => {
      await invalidateCatalog();
      setNewOptionDrafts((current) => {
        const next = { ...current };
        delete next[variables.productId];
        return next;
      });
      toast.success(`Nova opcao adicionada em ${variables.productName}.`);
    },
    onError: (error) => {
      toast.error(readCatalogError(error, "Nao foi possivel criar a opcao agora."));
    },
  });

  const optionMutation = useMutation({
    mutationFn: (input: { optionId: number; payload: Parameters<typeof updateAdminProductOption>[2] }) =>
      updateAdminProductOption(token, input.optionId, input.payload),
    onSuccess: async (option) => {
      await invalidateCatalog();
      setOptionDrafts((current) => {
        const next = { ...current };
        delete next[option.id];
        return next;
      });
      toast.success(`Opcao ${option.label} atualizada.`);
    },
    onError: (error) => {
      toast.error(readCatalogError(error, "Nao foi possivel salvar a opcao agora."));
    },
  });

  const pizzaPriceMutation = useMutation({
    mutationFn: (input: { categoryCode: string; payload: Parameters<typeof updateAdminPizzaBasePrices>[2] }) =>
      updateAdminPizzaBasePrices(token, input.categoryCode, input.payload),
    onSuccess: async (priceTable) => {
      await invalidateCatalog();
      setPriceDrafts((current) => {
        const next = { ...current };
        delete next[priceTable.categoryCode];
        return next;
      });
      toast.success(`Precos base de ${priceTable.categoryName} atualizados.`);
    },
    onError: (error) => {
      toast.error(readCatalogError(error, "Nao foi possivel salvar os precos base agora."));
    },
  });

  const crustPriceMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateAdminCrustPrices>[1]) =>
      updateAdminCrustPrices(token, payload),
    onSuccess: async () => {
      await invalidateCatalog();
      setCrustPriceDraft(null);
      toast.success("Tabela de bordas atualizada.");
    },
    onError: (error) => {
      toast.error(readCatalogError(error, "Nao foi possivel salvar os precos de borda agora."));
    },
  });

  const crustFlavorMutation = useMutation({
    mutationFn: (input: {
      crustFlavorId: number;
      payload: Parameters<typeof updateAdminCrustFlavor>[2];
    }) => updateAdminCrustFlavor(token, input.crustFlavorId, input.payload),
    onSuccess: async (crustFlavor) => {
      await invalidateCatalog();
      setCrustFlavorDrafts((current) => {
        const next = { ...current };
        delete next[crustFlavor.id];
        return next;
      });
      toast.success(`Borda ${crustFlavor.name} atualizada.`);
    },
    onError: (error) => {
      toast.error(readCatalogError(error, "Nao foi possivel salvar a borda agora."));
    },
  });

  const visibleCategories = useMemo(() => {
    return categories
      .filter((category) => categoryFilter === "all" || category.code === categoryFilter)
      .map((category) => ({
        ...category,
        products: category.products.filter((product) => matchesProductSearch(product, deferredSearch)),
      }))
      .filter((category) => category.products.length > 0 || !deferredSearch);
  }, [categories, categoryFilter, deferredSearch]);

  const stats = useMemo(() => {
    const allProducts = categories.flatMap((category) => category.products);
    const allOptions = allProducts.flatMap((product) => product.options);
    const crustFlavors = catalogQuery.data?.crustFlavors ?? [];
    const mediaItems = mediaLibraryQuery.data ?? [];

    return {
      categories: categories.length,
      products: allProducts.length,
      activeProducts: allProducts.filter((product) => product.isActive).length,
      options: allOptions.length,
      activeCrustFlavors: crustFlavors.filter((flavor) => flavor.isActive).length,
      uploadedImages: mediaItems.length,
      orphanImages: mediaItems.filter((item) => item.isOrphan).length,
    };
  }, [catalogQuery.data, categories, mediaLibraryQuery.data]);

  if (catalogQuery.isLoading) {
    return (
      <div className="rounded-[2rem] border border-border/60 bg-surface-elevated px-5 py-8 text-center text-sm text-muted-foreground shadow-sheet">
        Carregando catalogo do painel...
      </div>
    );
  }

  if (catalogQuery.error) {
    return (
      <div className="rounded-[2rem] border border-destructive/30 bg-destructive/10 px-5 py-8 text-center text-sm text-destructive shadow-sheet">
        {readCatalogError(catalogQuery.error, "Nao foi possivel carregar o catalogo agora.")}
      </div>
    );
  }

  const catalog = catalogQuery.data as AdminCatalogData;
  const activeCrustDraft = crustPriceDraft ?? toPriceDraft(catalog.crustPrices);
  const hasCrustPriceChanges = !samePriceDraft(activeCrustDraft, toPriceDraft(catalog.crustPrices));
  const newProductImages = imageKeysForType(createCategoryType);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-border/60 bg-surface-elevated p-6 shadow-sheet">
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80">Cardapio editavel</p>
        <h3 className="mt-2 font-display text-2xl font-semibold">Gestao inicial de catalogo</h3>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          O objetivo desta fase e tirar o dono da dependencia do codigo. Agora o painel ja consegue
          controlar disponibilidade, texto comercial, precificacao e cadastro basico sem editar arquivo local.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <CatalogMetric label="Categorias" value={String(stats.categories)} />
          <CatalogMetric label="Produtos" value={String(stats.products)} />
          <CatalogMetric label="Produtos ativos" value={String(stats.activeProducts)} />
          <CatalogMetric label="Opcoes de bebida" value={String(stats.options)} />
          <CatalogMetric label="Bordas ativas" value={String(stats.activeCrustFlavors)} />
          <CatalogMetric label="Midias orfas" value={String(stats.orphanImages)} />
        </div>
      </div>

      <section className="rounded-[2rem] border border-border/60 bg-surface-elevated p-6 shadow-sheet">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80">Biblioteca de midia</p>
            <h4 className="mt-2 font-display text-2xl font-semibold">Imagens enviadas pelo painel</h4>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Aqui voce enxerga quais arquivos estao em uso no cardapio, quais ficaram orfaos e quais podem ser
              excluidos com seguranca.
            </p>
          </div>

          <div className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">
            {uploadedMediaOptions.length} arquivo(s) enviado(s)
          </div>
        </div>

        {mediaLibraryQuery.isLoading ? (
          <div className="rounded-3xl border border-border/60 bg-background/60 px-5 py-8 text-center text-sm text-muted-foreground">
            Carregando biblioteca de imagens...
          </div>
        ) : mediaLibraryQuery.error ? (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/10 px-5 py-8 text-center text-sm text-destructive">
            {readCatalogError(mediaLibraryQuery.error, "Nao foi possivel carregar a biblioteca de imagens agora.")}
          </div>
        ) : uploadedMediaOptions.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {uploadedMediaOptions.map((item) => {
              const isDeleting =
                deleteMediaMutation.isPending && deleteMediaMutation.variables === item.fileName;

              return (
                <article
                  key={item.fileName}
                  className="rounded-3xl border border-border/60 bg-background/60 p-4"
                >
                  <img
                    src={item.publicUrl}
                    alt={item.fileName}
                    className="aspect-square w-full rounded-2xl object-cover"
                  />

                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.fileName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatFileSize(item.fileSizeBytes)} • {formatMediaDate(item.updatedAt)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${
                        item.isOrphan
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                      }`}
                    >
                      {item.isOrphan ? "Orfa" : `${item.usedByCount} uso(s)`}
                    </span>
                  </div>

                  <div className="mt-3 space-y-3">
                    <button
                      type="button"
                      onClick={() =>
                        setNewProductDraft((current) => ({
                          ...current,
                          imageKey: item.imageKey,
                        }))
                      }
                      className="inline-flex h-10 w-full items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/60"
                    >
                      Usar no novo cadastro
                    </button>

                    {item.usedByProducts.length > 0 ? (
                      <div className="rounded-2xl border border-border/60 bg-surface p-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          Produtos usando esta imagem
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.usedByProducts.map((product) => (
                            <span
                              key={`${item.fileName}-${product.id}`}
                              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                            >
                              {product.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhum produto usa esta imagem agora. Ela pode ser excluida sem quebrar o cardapio.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => deleteMediaMutation.mutate(item.fileName)}
                      disabled={!item.isOrphan || isDeleting}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeleting ? "Excluindo..." : "Excluir imagem orfa"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-border/60 bg-background/60 px-5 py-8 text-center text-sm text-muted-foreground">
            Nenhuma imagem enviada ainda. Quando voce fizer upload pelo painel, a biblioteca aparece aqui.
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-border/60 bg-surface-elevated p-6 shadow-sheet">
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80">Cadastro novo</p>
          <h4 className="mt-2 font-display text-2xl font-semibold">Adicionar produto ao cardapio</h4>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            O sistema gera o codigo interno sozinho. Para pizza, basta cadastrar o produto. Para bebida,
            ja nasce junto a primeira opcao de venda, porque bebida sem opcao nao fecha bem no fluxo publico.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_160px]">
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Categoria
                </span>
                <select
                  value={newProductDraft.categoryCode}
                  onChange={(event) => {
                    const nextCategory = categoryOptions.find(
                      (category) => category.value === event.target.value,
                    );

                    if (!nextCategory) {
                      return;
                    }

                    setNewProductDraft((current) => ({
                      ...current,
                      categoryCode: nextCategory.value,
                      imageKey:
                        imageKeysForType(nextCategory.productType).includes(current.imageKey)
                          ? current.imageKey
                          : defaultImageKey(nextCategory.productType),
                      badgeText: nextCategory.productType === "pizza" ? current.badgeText : "",
                      isFeatured: nextCategory.productType === "pizza" ? current.isFeatured : false,
                      initialOptionLabel:
                        nextCategory.productType === "drink" ? current.initialOptionLabel : "",
                      initialOptionPrice:
                        nextCategory.productType === "drink" ? current.initialOptionPrice : "",
                      initialOptionSortOrder:
                        nextCategory.productType === "drink" ? current.initialOptionSortOrder : "",
                    }));
                  }}
                  className={catalogFieldClass()}
                >
                  {categoryOptions.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Nome do produto
                </span>
                <input
                  value={newProductDraft.name}
                  onChange={(event) =>
                    setNewProductDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Ex.: Frango com barbecue"
                  className={catalogFieldClass()}
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Ordem
                </span>
                <input
                  value={newProductDraft.sortOrder}
                  onChange={(event) =>
                    setNewProductDraft((current) => ({
                      ...current,
                      sortOrder: event.target.value,
                    }))
                  }
                  inputMode="numeric"
                  placeholder="Automatico"
                  className={catalogFieldClass()}
                />
              </label>
            </div>

            <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Imagem base
                </span>
                <select
                  value={newProductDraft.imageKey}
                  onChange={(event) =>
                    setNewProductDraft((current) => ({
                      ...current,
                      imageKey: event.target.value,
                    }))
                  }
                  className={catalogFieldClass()}
                >
                  <optgroup label="Biblioteca local">
                    {newProductImages.map((imageKey) => (
                      <option key={imageKey} value={imageKey}>
                        {imageKey}
                      </option>
                    ))}
                  </optgroup>
                  {uploadedMediaOptions.length > 0 && (
                    <optgroup label="Biblioteca enviada">
                      {uploadedMediaOptions.map((item) => (
                        <option key={item.fileName} value={item.imageKey}>
                          {item.fileName}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>

              {createCategoryType === "pizza" ? (
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Selo curto
                  </span>
                  <input
                    value={newProductDraft.badgeText}
                    onChange={(event) =>
                      setNewProductDraft((current) => ({
                        ...current,
                        badgeText: event.target.value,
                      }))
                    }
                    placeholder="Ex.: Destaque"
                    className={catalogFieldClass()}
                  />
                </label>
              ) : (
                <div className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                  Categoria de bebida. O destaque comercial nao e usado aqui; o foco e cadastrar a primeira opcao de venda.
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                <img
                  src={resolveImageSource(newProductDraft.imageKey, defaultImageKey(createCategoryType))}
                  alt="Preview do novo produto"
                  className="aspect-square w-full rounded-2xl object-cover"
                />
              </div>

              <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Upload opcional
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Se quiser sair do banco de imagens local, envie uma foto aqui. O backend vai devolver um caminho
                  publico e esse produto passa a usar essa imagem.
                </p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => setNewProductImageFile(event.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-primary/12 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary"
                  />
                  <button
                    type="button"
                    onClick={() => void handleNewProductImageUpload()}
                    disabled={!newProductImageFile || imageUploadMutation.isPending}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background/80 px-4 text-sm font-semibold transition-colors hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {imageUploadMutation.isPending ? "Enviando..." : "Enviar imagem"}
                  </button>
                </div>
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Descricao
              </span>
              <textarea
                value={newProductDraft.description}
                onChange={(event) =>
                  setNewProductDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={4}
                placeholder="Texto comercial que vai aparecer para o cliente."
                className={`${catalogFieldClass()} min-h-[120px] resize-y`}
              />
            </label>
          </div>

          <div className="rounded-3xl border border-border/60 bg-background/60 p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Regras de criacao
            </p>

            <div className="mt-4 space-y-4">
              {createCategoryType === "pizza" ? (
                <>
                  <label className="inline-flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={newProductDraft.isFeatured}
                      onChange={(event) =>
                        setNewProductDraft((current) => ({
                          ...current,
                          isFeatured: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-border bg-background"
                    />
                    Marcar como destaque da casa
                  </label>

                  <p className="text-sm text-muted-foreground">
                    Como pizzas usam preco por categoria, o cadastro novo entra direto na tabela base da
                    categoria escolhida. Nao precisa cadastrar preco individual aqui.
                  </p>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <label className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Primeira opcao
                      </span>
                      <input
                        value={newProductDraft.initialOptionLabel}
                        onChange={(event) =>
                          setNewProductDraft((current) => ({
                            ...current,
                            initialOptionLabel: event.target.value,
                          }))
                        }
                        placeholder="Ex.: Lata 350ml"
                        className={catalogFieldClass()}
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Preco da opcao
                        </span>
                        <input
                          value={newProductDraft.initialOptionPrice}
                          onChange={(event) =>
                            setNewProductDraft((current) => ({
                              ...current,
                              initialOptionPrice: event.target.value,
                            }))
                          }
                          inputMode="decimal"
                          placeholder="Ex.: 7.5"
                          className={catalogFieldClass()}
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Ordem da opcao
                        </span>
                        <input
                          value={newProductDraft.initialOptionSortOrder}
                          onChange={(event) =>
                            setNewProductDraft((current) => ({
                              ...current,
                              initialOptionSortOrder: event.target.value,
                            }))
                          }
                          inputMode="numeric"
                          placeholder="Automatica"
                          className={catalogFieldClass()}
                        />
                      </label>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={newProductDraft.initialOptionIsActive}
                      onChange={(event) =>
                        setNewProductDraft((current) => ({
                          ...current,
                          initialOptionIsActive: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-border bg-background"
                    />
                    Primeira opcao ja nasce ativa
                  </label>
                </>
              )}

              <label className="inline-flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={newProductDraft.isActive}
                  onChange={(event) =>
                    setNewProductDraft((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-border bg-background"
                />
                Produto ja nasce visivel no site
              </label>

              <button
                onClick={() =>
                  createProductMutation.mutate({
                    categoryCode: newProductDraft.categoryCode,
                    name: newProductDraft.name.trim(),
                    description: normalizeNullableText(newProductDraft.description),
                    imageKey: newProductDraft.imageKey,
                    badgeText:
                      createCategoryType === "pizza"
                        ? normalizeNullableText(newProductDraft.badgeText)
                        : null,
                    isFeatured: createCategoryType === "pizza" ? newProductDraft.isFeatured : false,
                    isActive: newProductDraft.isActive,
                    sortOrder: parseOptionalSortOrder(newProductDraft.sortOrder),
                    initialOption:
                      createCategoryType === "drink"
                        ? {
                            label: newProductDraft.initialOptionLabel.trim(),
                            price: toDecimalNumber(newProductDraft.initialOptionPrice, 0),
                            isActive: newProductDraft.initialOptionIsActive,
                            sortOrder: parseOptionalSortOrder(newProductDraft.initialOptionSortOrder),
                          }
                        : null,
                  })
                }
                disabled={
                  createProductMutation.isPending ||
                  !newProductDraft.categoryCode ||
                  !newProductDraft.name.trim() ||
                  (createCategoryType === "drink" &&
                    (!newProductDraft.initialOptionLabel.trim() || !newProductDraft.initialOptionPrice.trim()))
                }
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary-gradient px-4 text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {createProductMutation.isPending ? "Criando produto..." : "Adicionar ao cardapio"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="rounded-[2rem] border border-border/60 bg-surface-elevated p-6 shadow-sheet">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80">Busca operacional</p>
            <h4 className="mt-2 font-display text-2xl font-semibold">Encontre o item certo rapido</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Busque por produto, codigo interno, descricao ou nome da opcao para evitar rolagem cega.
            </p>
          </div>

          <label className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background/80 px-4 py-3 lg:max-w-md">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar no catalogo"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/80"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter("all")}
            className={catalogFilterClass(categoryFilter === "all")}
          >
            Todas
          </button>
          {categoryOptions.map((category) => (
            <button
              key={category.value}
              onClick={() => setCategoryFilter(category.value)}
              className={catalogFilterClass(categoryFilter === category.value)}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-[2rem] border border-border/60 bg-surface-elevated p-6 shadow-sheet">
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80">Precos base</p>
          <h4 className="mt-2 font-display text-2xl font-semibold">Tabelas da pizza</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Aqui voce controla o preco por categoria e tamanho. Como varias pizzas compartilham a mesma tabela,
            essa camada precisa ser simples e confiavel.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {catalog.pizzaBasePrices.map((table) => {
            const draft = priceDrafts[table.categoryCode] ?? toPriceDraft(table.prices);
            const hasChanges = !samePriceDraft(draft, toPriceDraft(table.prices));
            const isSaving =
              pizzaPriceMutation.isPending &&
              pizzaPriceMutation.variables?.categoryCode === table.categoryCode;

            return (
              <article key={table.categoryCode} className="rounded-3xl border border-border/60 bg-background/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {table.categoryCode}
                    </p>
                    <h5 className="mt-1 font-display text-xl font-semibold">{table.categoryName}</h5>
                  </div>

                  <button
                    onClick={() =>
                      pizzaPriceMutation.mutate({
                        categoryCode: table.categoryCode,
                        payload: priceDraftToPayload(draft),
                      })
                    }
                    disabled={!hasChanges || isSaving}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary-gradient px-4 text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Salvando..." : "Salvar tabela"}
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {(["M", "G", "GG"] as const).map((sizeKey) => (
                    <label key={sizeKey} className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {sizeKey}
                      </span>
                      <input
                        value={draft[sizeKey]}
                        onChange={(event) =>
                          setPriceDrafts((current) => ({
                            ...current,
                            [table.categoryCode]: {
                              ...draft,
                              [sizeKey]: event.target.value,
                            },
                          }))
                        }
                        inputMode="decimal"
                        className={catalogFieldClass()}
                      />
                    </label>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[2rem] border border-border/60 bg-surface-elevated p-6 shadow-sheet">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80">Bordas recheadas</p>
            <h4 className="mt-2 font-display text-2xl font-semibold">Preco por tamanho</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              A borda e uma regra de negocio transversal. Ajustar aqui muda a experiencia do checkout inteiro.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {(["M", "G", "GG"] as const).map((sizeKey) => (
              <label key={sizeKey} className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {sizeKey}
                </span>
                <input
                  value={activeCrustDraft[sizeKey]}
                  onChange={(event) =>
                    setCrustPriceDraft({
                      ...activeCrustDraft,
                      [sizeKey]: event.target.value,
                    })
                  }
                  inputMode="decimal"
                  className={catalogFieldClass()}
                />
              </label>
            ))}
          </div>

          <button
            onClick={() => crustPriceMutation.mutate(priceDraftToPayload(activeCrustDraft))}
            disabled={!hasCrustPriceChanges || crustPriceMutation.isPending}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary-gradient px-5 text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {crustPriceMutation.isPending ? "Salvando..." : "Salvar tabela de borda"}
          </button>
        </article>

        <article className="rounded-[2rem] border border-border/60 bg-surface-elevated p-6 shadow-sheet">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80">Sabores de borda</p>
            <h4 className="mt-2 font-display text-2xl font-semibold">Nome, ordem e disponibilidade</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Em vez de apagar SKU no banco, o fluxo certo aqui e ligar ou desligar disponibilidade.
            </p>
          </div>

          <div className="space-y-4">
            {catalog.crustFlavors.map((flavor) => {
              const draft = crustFlavorDrafts[flavor.id] ?? toCrustFlavorDraft(flavor);
              const hasChanges = !sameCrustFlavorDraft(draft, toCrustFlavorDraft(flavor));
              const isSaving =
                crustFlavorMutation.isPending &&
                crustFlavorMutation.variables?.crustFlavorId === flavor.id;

              return (
                <div key={flavor.id} className="rounded-3xl border border-border/60 bg-background/60 p-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_110px]">
                    <label className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Nome
                      </span>
                      <input
                        value={draft.name}
                        onChange={(event) =>
                          setCrustFlavorDrafts((current) => ({
                            ...current,
                            [flavor.id]: {
                              ...draft,
                              name: event.target.value,
                            },
                          }))
                        }
                        className={catalogFieldClass()}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Descricao
                      </span>
                      <input
                        value={draft.description}
                        onChange={(event) =>
                          setCrustFlavorDrafts((current) => ({
                            ...current,
                            [flavor.id]: {
                              ...draft,
                              description: event.target.value,
                            },
                          }))
                        }
                        className={catalogFieldClass()}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Ordem
                      </span>
                      <input
                        value={draft.sortOrder}
                        onChange={(event) =>
                          setCrustFlavorDrafts((current) => ({
                            ...current,
                            [flavor.id]: {
                              ...draft,
                              sortOrder: event.target.value,
                            },
                          }))
                        }
                        inputMode="numeric"
                        className={catalogFieldClass()}
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="inline-flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={draft.isActive}
                        onChange={(event) =>
                          setCrustFlavorDrafts((current) => ({
                            ...current,
                            [flavor.id]: {
                              ...draft,
                              isActive: event.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 rounded border-border bg-background"
                      />
                      Borda disponivel no site
                    </label>

                    <button
                      onClick={() =>
                        crustFlavorMutation.mutate({
                          crustFlavorId: flavor.id,
                          payload: {
                            name: draft.name.trim(),
                            description: normalizeNullableText(draft.description),
                            isActive: draft.isActive,
                            sortOrder: toSortOrder(draft.sortOrder, flavor.sortOrder),
                          },
                        })
                      }
                      disabled={!hasChanges || isSaving}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary-gradient px-4 text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? "Salvando..." : "Salvar borda"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="space-y-6">
        {visibleCategories.map((category) => (
          <article
            key={category.code}
            className="rounded-[2rem] border border-border/60 bg-surface-elevated p-6 shadow-sheet"
          >
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80">
                  {category.productType === "pizza" ? "Pizzas" : "Bebidas"}
                </p>
                <h4 className="mt-2 font-display text-2xl font-semibold">{category.name}</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {category.products.length} item(ns) nesta categoria.
                </p>
              </div>

              <span className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {category.isActive ? "Categoria ativa" : "Categoria oculta"}
              </span>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {category.products.map((product) => {
                const draft = productDrafts[product.id] ?? toProductDraft(product);
                const hasChanges = !sameProductDraft(draft, toProductDraft(product));
                const isSaving =
                  productMutation.isPending && productMutation.variables?.productId === product.id;
                const imageOptions = imageKeysForType(product.productType);
                const newOptionDraft = newOptionDrafts[product.id] ?? createEmptyOptionDraft();
                const selectedImageFile = productImageFiles[product.id] ?? null;

                return (
                  <div key={product.id} className="rounded-3xl border border-border/60 bg-background/60 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          {product.code}
                        </p>
                        <h5 className="mt-1 font-display text-xl font-semibold">{product.name}</h5>
                      </div>

                      <span className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {product.isActive ? "Ativo" : "Oculto"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px]">
                      <label className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Nome comercial
                        </span>
                        <input
                          value={draft.name}
                          onChange={(event) =>
                            setProductDrafts((current) => ({
                              ...current,
                              [product.id]: {
                                ...draft,
                                name: event.target.value,
                              },
                            }))
                          }
                          className={catalogFieldClass()}
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Ordem
                        </span>
                        <input
                          value={draft.sortOrder}
                          onChange={(event) =>
                            setProductDrafts((current) => ({
                              ...current,
                              [product.id]: {
                                ...draft,
                                sortOrder: event.target.value,
                              },
                            }))
                          }
                          inputMode="numeric"
                          className={catalogFieldClass()}
                        />
                      </label>
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
                      <label className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Imagem base
                        </span>
                        <select
                          value={draft.imageKey}
                          onChange={(event) =>
                            setProductDrafts((current) => ({
                              ...current,
                              [product.id]: {
                                ...draft,
                                imageKey: event.target.value,
                              },
                            }))
                          }
                          className={catalogFieldClass()}
                        >
                          <optgroup label="Biblioteca local">
                            {imageOptions.map((imageKey) => (
                              <option key={imageKey} value={imageKey}>
                                {imageKey}
                              </option>
                            ))}
                          </optgroup>
                          {uploadedMediaOptions.length > 0 && (
                            <optgroup label="Biblioteca enviada">
                              {uploadedMediaOptions.map((item) => (
                                <option key={item.fileName} value={item.imageKey}>
                                  {item.fileName}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </label>

                      {product.productType === "pizza" ? (
                        <label className="space-y-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Selo curto
                          </span>
                          <input
                            value={draft.badgeText}
                            onChange={(event) =>
                              setProductDrafts((current) => ({
                                ...current,
                                [product.id]: {
                                  ...draft,
                                  badgeText: event.target.value,
                                },
                              }))
                            }
                            placeholder="Ex.: Destaque"
                            className={catalogFieldClass()}
                          />
                        </label>
                      ) : (
                        <div className="rounded-2xl border border-border/60 bg-surface px-4 py-3 text-sm text-muted-foreground">
                          Bebida nao usa selo de destaque nesta modelagem. O peso comercial fica nas opcoes e no preco.
                        </div>
                      )}
                    </div>

                    <div className="mt-3 grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                      <div className="rounded-2xl border border-border/60 bg-surface p-3">
                        <img
                          src={resolveImageSource(draft.imageKey, defaultImageKey(product.productType))}
                          alt={`Preview de ${product.name}`}
                          className="aspect-square w-full rounded-2xl object-cover"
                        />
                      </div>

                      <div className="rounded-2xl border border-dashed border-border/70 bg-surface p-4">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          Trocar imagem
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Envie uma nova foto para o backend. O produto so publica essa troca depois que voce salvar.
                        </p>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) =>
                              setProductImageFiles((current) => ({
                                ...current,
                                [product.id]: event.target.files?.[0] ?? null,
                              }))
                            }
                            className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-primary/12 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary"
                          />
                          <button
                            type="button"
                            onClick={() => void handleProductImageUpload(product)}
                            disabled={!selectedImageFile || imageUploadMutation.isPending}
                            className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background/80 px-4 text-sm font-semibold transition-colors hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {imageUploadMutation.isPending ? "Enviando..." : "Enviar imagem"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <label className="mt-3 block space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Descricao
                      </span>
                      <textarea
                        value={draft.description}
                        onChange={(event) =>
                          setProductDrafts((current) => ({
                            ...current,
                            [product.id]: {
                              ...draft,
                              description: event.target.value,
                            },
                          }))
                        }
                        rows={4}
                        className={`${catalogFieldClass()} min-h-[110px] resize-y`}
                      />
                    </label>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <label className="inline-flex items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={draft.isActive}
                          onChange={(event) =>
                            setProductDrafts((current) => ({
                              ...current,
                              [product.id]: {
                                ...draft,
                                isActive: event.target.checked,
                              },
                            }))
                          }
                          className="h-4 w-4 rounded border-border bg-background"
                        />
                        Produto ativo
                      </label>

                      {product.productType === "pizza" && (
                        <label className="inline-flex items-center gap-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={draft.isFeatured}
                            onChange={(event) =>
                              setProductDrafts((current) => ({
                                ...current,
                                [product.id]: {
                                  ...draft,
                                  isFeatured: event.target.checked,
                                },
                              }))
                            }
                            className="h-4 w-4 rounded border-border bg-background"
                          />
                          Marcar como destaque
                        </label>
                      )}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() =>
                          productMutation.mutate({
                            productId: product.id,
                            payload: {
                              name: draft.name.trim(),
                              description: normalizeNullableText(draft.description),
                              imageKey: draft.imageKey,
                              badgeText:
                                product.productType === "pizza"
                                  ? normalizeNullableText(draft.badgeText)
                                  : null,
                              isFeatured: product.productType === "pizza" ? draft.isFeatured : false,
                              isActive: draft.isActive,
                              sortOrder: toSortOrder(draft.sortOrder, product.sortOrder),
                            },
                          })
                        }
                        disabled={!hasChanges || isSaving}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary-gradient px-4 text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        {isSaving ? "Salvando..." : "Salvar produto"}
                      </button>
                    </div>

                    {product.productType === "drink" && (
                      <div className="mt-5 rounded-2xl border border-border/60 bg-surface p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                            Opcoes vendidas
                          </p>

                          <span className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                            {product.options.length} opcao(oes)
                          </span>
                        </div>

                        <div className="mt-3 space-y-3">
                          {product.options.map((option) => {
                            const optionDraft = optionDrafts[option.id] ?? toOptionDraft(option);
                            const hasOptionChanges = !sameOptionDraft(optionDraft, toOptionDraft(option));
                            const isSavingOption =
                              optionMutation.isPending &&
                              optionMutation.variables?.optionId === option.id;

                            return (
                              <div
                                key={option.id}
                                className="rounded-2xl border border-border/60 bg-background/70 p-4"
                              >
                                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_130px_110px]">
                                  <label className="space-y-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                      Nome da opcao
                                    </span>
                                    <input
                                      value={optionDraft.label}
                                      onChange={(event) =>
                                        setOptionDrafts((current) => ({
                                          ...current,
                                          [option.id]: {
                                            ...optionDraft,
                                            label: event.target.value,
                                          },
                                        }))
                                      }
                                      className={catalogFieldClass()}
                                    />
                                  </label>

                                  <label className="space-y-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                      Preco
                                    </span>
                                    <input
                                      value={optionDraft.price}
                                      onChange={(event) =>
                                        setOptionDrafts((current) => ({
                                          ...current,
                                          [option.id]: {
                                            ...optionDraft,
                                            price: event.target.value,
                                          },
                                        }))
                                      }
                                      inputMode="decimal"
                                      className={catalogFieldClass()}
                                    />
                                  </label>

                                  <label className="space-y-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                      Ordem
                                    </span>
                                    <input
                                      value={optionDraft.sortOrder}
                                      onChange={(event) =>
                                        setOptionDrafts((current) => ({
                                          ...current,
                                          [option.id]: {
                                            ...optionDraft,
                                            sortOrder: event.target.value,
                                          },
                                        }))
                                      }
                                      inputMode="numeric"
                                      className={catalogFieldClass()}
                                    />
                                  </label>
                                </div>

                                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <label className="inline-flex items-center gap-2 text-sm text-foreground">
                                    <input
                                      type="checkbox"
                                      checked={optionDraft.isActive}
                                      onChange={(event) =>
                                        setOptionDrafts((current) => ({
                                          ...current,
                                          [option.id]: {
                                            ...optionDraft,
                                            isActive: event.target.checked,
                                          },
                                        }))
                                      }
                                      className="h-4 w-4 rounded border-border bg-background"
                                    />
                                    Opcao disponivel
                                  </label>

                                  <button
                                    onClick={() =>
                                      optionMutation.mutate({
                                        optionId: option.id,
                                        payload: {
                                          label: optionDraft.label.trim(),
                                          price: toDecimalNumber(optionDraft.price, Number(option.price)),
                                          isActive: optionDraft.isActive,
                                          sortOrder: toSortOrder(optionDraft.sortOrder, option.sortOrder),
                                        },
                                      })
                                    }
                                    disabled={!hasOptionChanges || isSavingOption}
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-background/80 px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <Save className="h-4 w-4" />
                                    {isSavingOption ? "Salvando..." : "Salvar opcao"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          <div className="rounded-2xl border border-dashed border-border/80 bg-background/60 p-4">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Nova opcao
                            </p>

                            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_130px_110px]">
                              <label className="space-y-2">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                  Nome da opcao
                                </span>
                                <input
                                  value={newOptionDraft.label}
                                  onChange={(event) =>
                                    setNewOptionDrafts((current) => ({
                                      ...current,
                                      [product.id]: {
                                        ...newOptionDraft,
                                        label: event.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Ex.: 2L"
                                  className={catalogFieldClass()}
                                />
                              </label>

                              <label className="space-y-2">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                  Preco
                                </span>
                                <input
                                  value={newOptionDraft.price}
                                  onChange={(event) =>
                                    setNewOptionDrafts((current) => ({
                                      ...current,
                                      [product.id]: {
                                        ...newOptionDraft,
                                        price: event.target.value,
                                      },
                                    }))
                                  }
                                  inputMode="decimal"
                                  placeholder="Ex.: 12"
                                  className={catalogFieldClass()}
                                />
                              </label>

                              <label className="space-y-2">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                  Ordem
                                </span>
                                <input
                                  value={newOptionDraft.sortOrder}
                                  onChange={(event) =>
                                    setNewOptionDrafts((current) => ({
                                      ...current,
                                      [product.id]: {
                                        ...newOptionDraft,
                                        sortOrder: event.target.value,
                                      },
                                    }))
                                  }
                                  inputMode="numeric"
                                  placeholder="Automatica"
                                  className={catalogFieldClass()}
                                />
                              </label>
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <label className="inline-flex items-center gap-2 text-sm text-foreground">
                                <input
                                  type="checkbox"
                                  checked={newOptionDraft.isActive}
                                  onChange={(event) =>
                                    setNewOptionDrafts((current) => ({
                                      ...current,
                                      [product.id]: {
                                        ...newOptionDraft,
                                        isActive: event.target.checked,
                                      },
                                    }))
                                  }
                                  className="h-4 w-4 rounded border-border bg-background"
                                />
                                Opcao ja nasce ativa
                              </label>

                              <button
                                onClick={() =>
                                  createOptionMutation.mutate({
                                    productId: product.id,
                                    productName: product.name,
                                    payload: {
                                      productId: product.id,
                                      label: newOptionDraft.label.trim(),
                                      price: toDecimalNumber(newOptionDraft.price, 0),
                                      isActive: newOptionDraft.isActive,
                                      sortOrder: parseOptionalSortOrder(newOptionDraft.sortOrder),
                                    },
                                  })
                                }
                                disabled={
                                  createOptionMutation.isPending ||
                                  !newOptionDraft.label.trim() ||
                                  !newOptionDraft.price.trim()
                                }
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary-gradient px-4 text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Plus className="h-4 w-4" />
                                {createOptionMutation.isPending &&
                                createOptionMutation.variables?.productId === product.id
                                  ? "Criando..."
                                  : "Adicionar opcao"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </article>
        ))}

        {visibleCategories.length === 0 && (
          <div className="rounded-[2rem] border border-border/60 bg-surface-elevated px-5 py-8 text-center text-sm text-muted-foreground shadow-sheet">
            Nenhum item do catalogo encontrado com os filtros atuais.
          </div>
        )}
      </section>
    </div>
  );
}

function CatalogMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-3xl border border-border/60 bg-background/60 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </article>
  );
}

function matchesProductSearch(product: AdminCatalogProduct, search: string) {
  if (!search) {
    return true;
  }

  const haystack = [
    product.name,
    product.code,
    product.description ?? "",
    product.categoryName,
    product.badgeText ?? "",
    ...product.options.map((option) => option.label),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

function catalogFilterClass(isActive: boolean) {
  return `rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
    isActive
      ? "border-primary bg-primary/12 text-primary"
      : "border-border bg-surface text-muted-foreground hover:border-primary/50 hover:text-foreground"
  }`;
}

function catalogFieldClass() {
  return "w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-primary";
}

function createEmptyProductDraft(categoryCode: string, productType: AdminProductType): NewProductDraft {
  return {
    categoryCode,
    name: "",
    description: "",
    imageKey: defaultImageKey(productType),
    badgeText: "",
    isFeatured: false,
    isActive: true,
    sortOrder: "",
    initialOptionLabel: "",
    initialOptionPrice: "",
    initialOptionIsActive: true,
    initialOptionSortOrder: "",
  };
}

function createEmptyOptionDraft(): NewOptionDraft {
  return {
    label: "",
    price: "",
    isActive: true,
    sortOrder: "",
  };
}

function defaultImageKey(productType: AdminProductType): (typeof pizzaImageKeys)[number] | (typeof drinkImageKeys)[number] {
  return productType === "pizza" ? "mussarela" : "drink-cola";
}

function imageKeysForType(productType: AdminProductType) {
  return productType === "pizza" ? pizzaImageKeys : drinkImageKeys;
}

function toProductDraft(product: AdminCatalogProduct): ProductDraft {
  return {
    name: product.name,
    description: product.description ?? "",
    imageKey: product.imageKey ?? defaultImageKey(product.productType),
    badgeText: product.badgeText ?? "",
    isFeatured: product.isFeatured,
    isActive: product.isActive,
    sortOrder: String(product.sortOrder),
  };
}

function toOptionDraft(option: AdminCatalogProductOption): OptionDraft {
  return {
    label: option.label,
    price: formatPriceInput(option.price),
    isActive: option.isActive,
    sortOrder: String(option.sortOrder),
  };
}

function toCrustFlavorDraft(flavor: AdminCrustFlavor): CrustFlavorDraft {
  return {
    name: flavor.name,
    description: flavor.description ?? "",
    isActive: flavor.isActive,
    sortOrder: String(flavor.sortOrder),
  };
}

function toPriceDraft(prices: AdminPizzaBasePrice["prices"] | AdminCrustPrices): PriceDraft {
  return {
    M: formatPriceInput(prices.M),
    G: formatPriceInput(prices.G),
    GG: formatPriceInput(prices.GG),
  };
}

function sameProductDraft(left: ProductDraft, right: ProductDraft) {
  return (
    left.name.trim() === right.name.trim() &&
    normalizeNullableText(left.description) === normalizeNullableText(right.description) &&
    left.imageKey === right.imageKey &&
    normalizeNullableText(left.badgeText) === normalizeNullableText(right.badgeText) &&
    left.isFeatured === right.isFeatured &&
    left.isActive === right.isActive &&
    toSortOrder(left.sortOrder, Number(right.sortOrder)) === toSortOrder(right.sortOrder, Number(right.sortOrder))
  );
}

function sameOptionDraft(left: OptionDraft, right: OptionDraft) {
  return (
    left.label.trim() === right.label.trim() &&
    toDecimalNumber(left.price, Number(right.price)) === toDecimalNumber(right.price, Number(right.price)) &&
    left.isActive === right.isActive &&
    toSortOrder(left.sortOrder, Number(right.sortOrder)) === toSortOrder(right.sortOrder, Number(right.sortOrder))
  );
}

function sameCrustFlavorDraft(left: CrustFlavorDraft, right: CrustFlavorDraft) {
  return (
    left.name.trim() === right.name.trim() &&
    normalizeNullableText(left.description) === normalizeNullableText(right.description) &&
    left.isActive === right.isActive &&
    toSortOrder(left.sortOrder, Number(right.sortOrder)) === toSortOrder(right.sortOrder, Number(right.sortOrder))
  );
}

function samePriceDraft(left: PriceDraft, right: PriceDraft) {
  return (
    toDecimalNumber(left.M, Number(right.M)) === toDecimalNumber(right.M, Number(right.M)) &&
    toDecimalNumber(left.G, Number(right.G)) === toDecimalNumber(right.G, Number(right.G)) &&
    toDecimalNumber(left.GG, Number(right.GG)) === toDecimalNumber(right.GG, Number(right.GG))
  );
}

function priceDraftToPayload(draft: PriceDraft) {
  return {
    M: toDecimalNumber(draft.M, 0),
    G: toDecimalNumber(draft.G, 0),
    GG: toDecimalNumber(draft.GG, 0),
  };
}

function toSortOrder(value: string, fallback: number) {
  const normalized = Number.parseInt(value.trim(), 10);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function parseOptionalSortOrder(value: string) {
  const normalized = Number.parseInt(value.trim(), 10);
  return Number.isFinite(normalized) ? normalized : undefined;
}

function toDecimalNumber(value: string | number, fallback: number) {
  if (typeof value === "number") {
    return value;
  }

  const normalized = Number.parseFloat(value.replace(",", ".").trim());
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeNullableText(value: string | null) {
  if (value == null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function formatPriceInput(value: string | number) {
  const numeric = typeof value === "number" ? value : Number.parseFloat(value);

  if (!Number.isFinite(numeric)) {
    return "";
  }

  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMediaDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "data invalida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function readCatalogError(error: unknown, fallback: string) {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
