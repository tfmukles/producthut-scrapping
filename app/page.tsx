"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpDown,
  Code,
  Database,
  ExternalLink,
  Filter,
  Layout,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import data from "../script/data.json";

type Product = {
  title: string;
  description: string;
  tags: string[];
  image: string;
  comment: string;
  technologies?: {
    frameworks?: string[];
    cms?: string[];
    javascriptLibraries?: string[];
  };
  websiteLink?: string;
};

const initialData = data as Product[];

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedFramework, setSelectedFramework] = useState("all");
  const [selectedCMS, setSelectedCMS] = useState("all");
  const [selectedLibrary, setSelectedLibrary] = useState("all");

  const allTags = Array.from(new Set(initialData.flatMap((item) => item.tags)));
  const allFrameworks = Array.from(
    new Set(initialData.flatMap((item) => item.technologies?.frameworks))
  );
  const allCMS = Array.from(
    new Set(initialData.flatMap((item) => item.technologies?.cms))
  );
  const allLibraries = Array.from(
    new Set(
      initialData.flatMap((item) => item.technologies?.javascriptLibraries)
    )
  );

  const filteredData = initialData
    .filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag =
        selectedTag === "all" || item.tags.includes(selectedTag);
      const matchesFramework =
        selectedFramework === "all" ||
        item.technologies?.frameworks?.includes(selectedFramework);
      const matchesCMS =
        selectedCMS === "all" || item.technologies?.cms?.includes(selectedCMS);
      const matchesLibrary =
        selectedLibrary === "all" ||
        item.technologies?.javascriptLibraries?.includes(selectedLibrary);

      return (
        matchesSearch &&
        matchesTag &&
        matchesFramework &&
        matchesCMS &&
        matchesLibrary
      );
    })
    .sort((a, b) => {
      const order = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "title") {
        return order * a.title.localeCompare(b.title);
      }
      return order * (parseInt(b.comment) - parseInt(a.comment));
    });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const resetFilters = () => {
    setSelectedTag("all");
    setSelectedFramework("all");
    setSelectedCMS("all");
    setSelectedLibrary("all");
    setSearchTerm("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                Products
              </h1>
              <p className="mt-2 text-muted-foreground">
                Discover and filter through our collection of products
              </p>
            </div>
            <div className="flex space-x-4">
              <div className="relative flex-1 md:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  className="pl-9 pr-4 h-10 bg-white dark:bg-gray-800"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Technology Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-2 mb-4">
              <Code className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Technology Filters</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Framework
                </label>
                <Select
                  value={selectedFramework}
                  onValueChange={setSelectedFramework}
                >
                  <SelectTrigger className="w-full">
                    <Layout className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select Framework" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Frameworks</SelectItem>
                    {allFrameworks.map((framework) => (
                      <SelectItem key={framework} value={framework!}>
                        {framework}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  CMS
                </label>
                <Select value={selectedCMS} onValueChange={setSelectedCMS}>
                  <SelectTrigger className="w-full">
                    <Database className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select CMS" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All CMS</SelectItem>
                    {allCMS.map((cms) => (
                      <SelectItem key={cms} value={cms!}>
                        {cms}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Library
                </label>
                <Select
                  value={selectedLibrary}
                  onValueChange={setSelectedLibrary}
                >
                  <SelectTrigger className="w-full">
                    <Code className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select Library" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Libraries</SelectItem>
                    {allLibraries.map((library) => (
                      <SelectItem key={library} value={library!}>
                        {library}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full flex items-center gap-2 h-10"
                  onClick={resetFilters}
                >
                  <X className="h-4 w-4" />
                  Reset Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Tag Filters */}
          <Accordion
            type="single"
            collapsible
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border"
          >
            <AccordionItem value="tags" className="border-none">
              <AccordionTrigger className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Filter by Tags</h2>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 max-h-[300px] overscroll-y-auto">
                <div className="flex flex-wrap gap-2 h-full">
                  <Button
                    variant={selectedTag === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTag("all")}
                    className="rounded-full"
                  >
                    All
                  </Button>
                  {allTags.map((tag) => (
                    <Button
                      key={tag}
                      variant={selectedTag === tag ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTag(tag)}
                      className="rounded-full"
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Results Count */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Found</span>
            <span className="font-medium text-foreground">
              {filteredData.length}
            </span>
            <span className="text-sm text-muted-foreground">products</span>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50px]">Logo</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("title")}
                      className="flex items-center space-x-2 hover:bg-transparent"
                    >
                      Title
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[300px]">Description</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("comment")}
                      className="flex items-center space-x-2 hover:bg-transparent"
                    >
                      Comments
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Technologies</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((product, index) => (
                  <TableRow
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <TableCell>
                      <div className="relative w-10 h-10">
                        <img
                          src={product.image}
                          alt={product.title}
                          className="rounded-lg object-cover border shadow-sm"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium hover:text-primary transition-colors">
                        {product.title}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.description}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {product.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="rounded-full text-xs px-2.5 py-0.5 font-medium"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 px-2.5 py-0.5 text-sm font-medium text-blue-700 dark:text-blue-300">
                        {product.comment}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {product.technologies?.frameworks?.map((fw) => (
                            <Badge
                              key={fw}
                              variant="outline"
                              className="bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800"
                            >
                              {fw}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {product.technologies?.cms?.map((cms) => (
                            <Badge
                              key={cms}
                              variant="outline"
                              className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            >
                              {cms}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {product.technologies?.javascriptLibraries?.map(
                            (lib) => (
                              <Badge
                                key={lib}
                                variant="outline"
                                className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                              >
                                {lib}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <a
                        href={product.websiteLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        <span>Visit</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
