FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src
COPY labiq-api/LabIQ.Api/ ./
RUN dotnet restore LabIQ.Api.csproj
RUN dotnet publish LabIQ.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:7.0
WORKDIR /app
COPY --from=build /app/publish .

# Railway sets PORT dynamically
ENV ASPNETCORE_URLS=http://+:${PORT:-8080}

CMD ["dotnet", "LabIQ.Api.dll"]
